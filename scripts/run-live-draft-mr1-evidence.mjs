import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4185
const server = await createServer({
  root: editorRoot,
  appType: "spa",
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: vitePort,
    strictPort: true,
    fs: { allow: [editorRoot, coreRoot] },
  },
})

function reservePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createNetServer()
    probe.once("error", reject)
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address()
      if (address == null || typeof address === "string") {
        probe.close()
        reject(new Error("failed to reserve a Chrome debugging port"))
        return
      }
      probe.close(() => resolvePort(address.port))
    })
  })
}

async function waitForChromeTarget(port) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (response.ok) {
        const targets = await response.json()
        const target = targets.find((candidate) => candidate.type === "page")
        if (target?.webSocketDebuggerUrl) return target.webSocketDebuggerUrl
      }
    } catch {
      // Chrome may still be starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))
  }
  throw new Error("Chrome DevTools target did not become ready")
}

async function createCdpClient(webSocketUrl, onEvent) {
  const socket = new WebSocket(webSocketUrl)
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  let nextId = 1
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data))
    if (message.id == null) {
      onEvent(message)
      return
    }
    const waiter = pending.get(message.id)
    if (waiter == null) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })
  return {
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId++
      return new Promise((resolveResult, reject) => {
        pending.set(id, { resolve: resolveResult, reject })
        socket.send(JSON.stringify({ id, method, params }))
      })
    },
  }
}

async function runBrowser(chromePath, profileRoot) {
  const debuggingPort = await reservePort()
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileRoot}`,
    `--remote-debugging-port=${debuggingPort}`,
    "about:blank",
  ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] })
  let chromeError = ""
  chrome.stderr.setEncoding("utf8")
  chrome.stderr.on("data", (chunk) => { chromeError += chunk })
  try {
    const webSocketUrl = await waitForChromeTarget(debuggingPort)
    const requests = []
    const cdp = await createCdpClient(webSocketUrl, (message) => {
      if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url)
    })
    try {
      await cdp.send("Page.enable")
      await cdp.send("Runtime.enable")
      await cdp.send("Network.enable")
      const version = await cdp.send("Browser.getVersion")
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${vitePort}/qa/live-draft-mr1-evidence.html` })
      const deadline = Date.now() + 180_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const target = document.querySelector('#flowdoc-live-draft-mr1-result'); return target == null ? null : { status: target.dataset.status, text: target.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") {
          return { output: JSON.parse(value.text), browserVersion: version.product, requests }
        }
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser MR1 evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser MR1 evidence timed out")
    } finally {
      cdp.close()
    }
  } catch (error) {
    if (chrome.exitCode != null && chrome.exitCode !== 0 && chromeError) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\n${chromeError}`)
    }
    throw error
  } finally {
    if (chrome.exitCode == null) chrome.kill()
    await new Promise((resolveClose) => {
      if (chrome.exitCode != null) resolveClose()
      else chrome.once("close", resolveClose)
    })
  }
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function numericLeaves(value, path = "root", output = new Map()) {
  if (typeof value === "number") {
    output.set(path, value)
    return output
  }
  if (Array.isArray(value)) {
    value.forEach((candidate, index) => numericLeaves(candidate, `${path}[${index}]`, output))
    return output
  }
  if (value != null && typeof value === "object") {
    Object.keys(value).sort().forEach((key) => numericLeaves(value[key], `${path}.${key}`, output))
  }
  return output
}

function maximumNumericDrift(left, right) {
  const leftValues = numericLeaves(left)
  const rightValues = numericLeaves(right)
  if (leftValues.size !== rightValues.size) throw new Error("MR1 numeric shape mismatch")
  let maximum = 0
  for (const [path, value] of leftValues) {
    if (!rightValues.has(path)) throw new Error(`MR1 numeric path mismatch: ${path}`)
    maximum = Math.max(maximum, Math.abs(value - rightValues.get(path)))
  }
  return maximum
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)]
}

function distribution(values) {
  return {
    sampleCount: values.length,
    minMs: Math.min(...values),
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: Math.max(...values),
  }
}

const chromePath = process.env.FLOWDOC_CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-mr1-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const runtime = await server.ssrLoadModule("/scripts/run-live-draft-mr1-evidence-runtime.ts")
  const node = runtime.runNodeMr1Evidence()
  if (node.result.status !== "accepted" || browser.output.result.status !== "accepted") {
    throw new Error("MR1 Node or real Browser Worker result was blocked")
  }
  const requestExact = JSON.stringify(node.result.request) === JSON.stringify(browser.output.result.request)
  const layoutExact = JSON.stringify(node.result.layout) === JSON.stringify(browser.output.result.layout)
  const requestDrift = maximumNumericDrift(node.result.request, browser.output.result.request)
  const layoutDrift = maximumNumericDrift(node.result.layout, browser.output.result.layout)
  const line = browser.output.result.layout.lines[0]
  const fontSwitch = JSON.stringify(line.fragments.map((fragment) => fragment.fontFaceId))
    === JSON.stringify(["sarabun-regular", "sarabun-bold", "sarabun-regular"])
  const fieldRetained = line.fragments.some((fragment) => fragment.sourceSegments.some((segment) => (
    segment.kind === "resolved-field" && segment.fieldKey === "customer.initial"
  )))
  const baselineAccepted = line.naturalAscentLayoutUnit === 25_632_000
    && line.naturalDescentLayoutUnit === 5_568_000
    && line.naturalHeightLayoutUnit === 31_200_000
    && line.baselineOffsetLayoutUnit === 25_632_000
  if (!requestExact || !layoutExact || requestDrift !== 0 || layoutDrift !== 0
    || !fontSwitch || !fieldRetained || !baselineAccepted || !browser.output.samplesConsistent) {
    throw new Error(`MR1 cross-runtime parity mismatch: ${JSON.stringify({
      requestExact,
      layoutExact,
      requestDrift,
      layoutDrift,
      fontSwitch,
      fieldRetained,
      baselineAccepted,
      samplesConsistent: browser.output.samplesConsistent,
    })}`)
  }
  const backendLikeRequests = browser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  if (backendLikeRequests.length > 0) throw new Error("MR1 QA Worker created a Backend-like request")

  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-real-browser-worker-parity-v1",
    status: "accepted-bounded-real-browser-worker-parity",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      nodeNativeRustybuzz: true,
      nodeNativeIcu4x: true,
      realChromeWorker: true,
      workerWasmRustybuzz: true,
      workerWasmIcu4x: true,
      coreMultiRunAcceptance: true,
      productionBinding: false,
      editorProductBinding: false,
      backendRequestCount: backendLikeRequests.length,
    },
    identity: {
      wasmSha256: runtime.FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
      measurementProfileId: node.identity.measurementProfileId,
      workerBoundaryVersion: browser.output.identity.boundaryVersion,
      fontSha256ById: browser.output.identity.fontSha256ById,
    },
    parity: {
      requestExact,
      layoutExact,
      requestMaximumIntegerDrift: requestDrift,
      layoutMaximumIntegerDrift: layoutDrift,
      requestSha256: digest(node.result.request),
      layoutSha256: digest(node.result.layout),
      browserRequestSha256: digest(browser.output.result.request),
      browserLayoutSha256: digest(browser.output.result.layout),
    },
    outcome: {
      shapingRunCount: browser.output.result.summary.shapingRunCount,
      clusterCount: browser.output.result.summary.clusterCount,
      lineCount: browser.output.result.summary.lineCount,
      fragmentCount: line.fragments.length,
      fragmentFontFaceIds: line.fragments.map((fragment) => fragment.fontFaceId),
      fieldRetained,
      lineWidthLayoutUnit: line.widthLayoutUnit,
      naturalAscentLayoutUnit: line.naturalAscentLayoutUnit,
      naturalDescentLayoutUnit: line.naturalDescentLayoutUnit,
      naturalHeightLayoutUnit: line.naturalHeightLayoutUnit,
      baselineOffsetLayoutUnit: line.baselineOffsetLayoutUnit,
      fontSwitch,
    },
    timing: {
      observationalNoBudget: true,
      assetFetchDurationMs: browser.output.assetFetchDurationMs,
      workerRoundTripMs: browser.output.workerRoundTripMs,
      workerDurationMs: browser.output.workerDurationMs,
      initializationDurationMs: browser.output.initializationDurationMs,
      coldLayoutDurationMs: browser.output.coldLayoutDurationMs,
      warmLayout: distribution(browser.output.warmLayoutDurationMs),
      samplesConsistent: browser.output.samplesConsistent,
      nodeDurationMs: node.durationMs,
    },
    scope: {
      oneTextBlock: true,
      mixedSizeOneLine: true,
      realBrowserWorkerParity: true,
      displayListBinding: false,
      canvasPaintBinding: false,
      backendBinding: false,
      defaultMeasurerReplacement: false,
      wholeDocumentComposition: false,
      productionBinding: false,
      glyphPixelParity: false,
    },
  }
  const outputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-real-browser-worker-parity.v1.json")
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({ outputPath, status: evidence.status, parity: evidence.parity }, null, 2)}\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
