import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4188
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
      await cdp.send("Page.navigate", {
        url: `http://127.0.0.1:${vitePort}/qa/live-draft-mr1-range-evidence.html`,
      })
      const deadline = Date.now() + 240_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const result = document.querySelector('#flowdoc-live-draft-mr1-range-result'); return result == null ? null : { status: result.dataset.status, text: result.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") return {
          output: JSON.parse(value.text),
          browserVersion: version.product,
          requests,
        }
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser MR1 range evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser MR1 range evidence timed out")
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
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-mr1-range-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const output = browser.output
  const backendLikeRequests = browser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  const shapeExact = output.scenarios.every((scenario) => (
    scenario.shapeProof.status === "exact"
      && scenario.shapeProof.mayPublishLayout === true
  ))
  const segmentationExact = output.scenarios.every((scenario) => (
    scenario.boundedSegmentation.status === "bounded-stable"
      && scenario.boundedSegmentation.attempts.length === 3
      && scenario.boundedSegmentation.oracleVerified === false
      && scenario.boundedSegmentation.mayPublishLayout === false
      && scenario.segmentationProof.status === "exact"
      && scenario.segmentationProof.mayPublishLayout === true
  ))
  const workBounded = output.scenarios.every((scenario) => (
    scenario.work.rangeUtf16Length < 64
      && scenario.work.shapeUtf16ReductionRatio < 0.02
      && scenario.work.widestSegmentationContextUtf16Length < 320
  ))
  if (
    output.baseline.fullTextUtf16Length !== 4_959
      || output.scenarios.length !== 6
      || !shapeExact
      || !segmentationExact
      || !workBounded
      || backendLikeRequests.length > 0
  ) throw new Error(`MR1 range acceptance mismatch: ${JSON.stringify({
    baseline: output.baseline,
    scenarioCount: output.scenarios.length,
    shapeExact,
    segmentationExact,
    workBounded,
    backendRequestCount: backendLikeRequests.length,
  })}`)

  const fullShapeSamples = Object.values(output.baseline.fullShapeDurationMsByFontFaceId).flat()
  const rangeShapeSamples = output.scenarios.flatMap((scenario) => scenario.timing.rangeShapeDurationMs)
  const boundedSegmentationSamples = output.scenarios.flatMap((scenario) => (
    scenario.timing.boundedSegmentationDurationMs
  ))
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-contextual-range-facts-v1",
    status: "accepted-oracle-proved-range-facts",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      realChromeWorkerWasm: true,
      fullOracleExecuted: true,
      contextualRangeShapingExecuted: true,
      boundedRangeSegmentationExecuted: true,
      scenarioCount: output.scenarios.length,
      warmSamplesPerScenario: 10,
      backendRequestCount: backendLikeRequests.length,
      rangeFactsMayPublishWithoutOracle: false,
      productBinding: false,
      productionBinding: false,
    },
    identity: output.identity,
    baseline: {
      fullTextUtf16Length: output.baseline.fullTextUtf16Length,
      fullTextScalarCount: output.baseline.fullTextScalarCount,
    },
    outcome: {
      shapeExact,
      segmentationExact,
      workBounded,
      scenarios: output.scenarios.map((scenario) => ({
        scenarioId: scenario.scenarioId,
        unitIndex: scenario.unitIndex,
        fontFaceId: scenario.fontFaceId,
        rangeStartUtf16: scenario.rangeStartUtf16,
        rangeEndUtf16: scenario.rangeEndUtf16,
        shapeContextStartUtf16: scenario.shapeContextStartUtf16,
        shapeContextEndUtf16: scenario.shapeContextEndUtf16,
        shapeProof: scenario.shapeProof,
        segmentationProof: scenario.segmentationProof,
        boundedSegmentation: scenario.boundedSegmentation,
        work: scenario.work,
      })),
    },
    timing: {
      interactionReferenceMs: 16.7,
      fullShape: distribution(fullShapeSamples),
      rangeShape: distribution(rangeShapeSamples),
      fullSegmentation: distribution(output.baseline.fullSegmentationDurationMs),
      boundedSegmentation: distribution(boundedSegmentationSamples),
      assetFetchDurationMs: output.assetFetchDurationMs,
      workerRoundTripMs: output.workerRoundTripMs,
      timingIsDiagnosticOnly: true,
      productFrameGateClaimed: false,
    },
    contracts: output.contracts,
    scope: {
      textBlockEffectiveRunOnly: true,
      regularAndBoldFontFaces: true,
      ThaiAndLatinText: true,
      exactIntegerOracleComparison: true,
      actualContextualRangeShaping: true,
      actualBoundedRangeSegmentation: true,
      lineReassembly: false,
      tables: false,
      columns: false,
      images: false,
      autoFitColumnWidth: false,
      productBinding: false,
      backendBinding: false,
      productionBinding: false,
    },
  }
  const outputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-contextual-range-facts.v1.json")
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    outcome: {
      shapeExact,
      segmentationExact,
      workBounded,
    },
    timing: evidence.timing,
  }, null, 2)}\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
