import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4180
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

async function createCdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener("open", resolveOpen, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  let nextId = 1
  const pending = new Map()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data))
    if (message.id == null) return
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

async function runBrowserXr2(chromePath, profileRoot) {
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
    const cdp = await createCdpClient(webSocketUrl)
    try {
      await cdp.send("Page.enable")
      await cdp.send("Runtime.enable")
      const version = await cdp.send("Browser.getVersion")
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${vitePort}/qa/live-draft-xr2-evidence.html` })
      const deadline = Date.now() + 180_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const target = document.querySelector('#flowdoc-live-draft-xr2-result'); return target == null ? null : { status: target.dataset.status, text: target.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") return { output: JSON.parse(value.text), browserVersion: version.product }
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser XR-2 evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser XR-2 evidence timed out")
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

function correctness(layout) {
  return {
    contractVersion: layout.contractVersion,
    measurement: {
      widthPt: layout.measurement.widthPt,
      heightPt: layout.measurement.heightPt,
      lineHeightPt: layout.measurement.lineHeightPt,
      lineBoxes: layout.measurement.lineBoxes.map(({ text: _text, ...line }) => line),
    },
    acceptanceSummary: layout.acceptanceSummary,
    pagination: layout.pagination,
  }
}

function percentile(values, ratio) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)]
}

function distribution(samples, read) {
  const values = samples.map(read)
  return {
    sampleCount: values.length,
    minMs: Math.min(...values),
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    maxMs: Math.max(...values),
  }
}

function summarizeNode(samples) {
  return {
    total: distribution(samples, (sample) => sample.totalDurationMs),
    provider: distribution(samples, (sample) => sample.coreLayout.timings.providerMs),
    measurement: distribution(samples, (sample) => sample.coreLayout.timings.measurementMs),
    acceptance: distribution(samples, (sample) => sample.coreLayout.timings.acceptanceMs),
    pagination: distribution(samples, (sample) => sample.coreLayout.timings.paginationMs),
    coreBoundary: distribution(samples, (sample) => sample.coreLayout.timings.coreBoundaryMs),
    providerInvocationCount: samples.filter((sample) => sample.coreLayout.timings.providerInvoked).length,
  }
}

function summarizeWorker(samples) {
  return {
    roundTrip: distribution(samples, (sample) => sample.roundTripMs),
    worker: distribution(samples, (sample) => sample.workerDurationMs),
    provider: distribution(samples, (sample) => sample.timings.providerMs),
    measurement: distribution(samples, (sample) => sample.timings.measurementMs),
    acceptance: distribution(samples, (sample) => sample.timings.acceptanceMs),
    pagination: distribution(samples, (sample) => sample.timings.paginationMs),
    coreBoundary: distribution(samples, (sample) => sample.timings.coreBoundaryMs),
    providerInvocationCount: samples.filter((sample) => sample.timings.providerInvoked).length,
  }
}

const chromePath = process.env.FLOWDOC_CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-xr2-"))

try {
  await server.listen()
  const browser = await runBrowserXr2(chromePath, profileRoot)
  const runtime = await server.ssrLoadModule("/scripts/run-live-draft-xr2-evidence-runtime.ts")
  const nodeRows = runtime.runNodeXr2Rows()
  if (nodeRows.length !== browser.output.rows.length) throw new Error("Node/Worker XR-2 row count mismatch")
  const rows = nodeRows.map((nodeRow, index) => {
    const workerRow = browser.output.rows[index]
    if (nodeRow.rowId !== workerRow.rowId) throw new Error(`Node/Worker XR-2 row mismatch: ${nodeRow.rowId}`)
    const nodeCorrectness = correctness(nodeRow.cold[0].coreLayout)
    const workerCorrectness = correctness(workerRow.reference.coreLayout)
    const normalizedExact = JSON.stringify(nodeRow.normalizedResult) === JSON.stringify(workerRow.reference.measurement)
    const coreLayoutExact = JSON.stringify(nodeCorrectness) === JSON.stringify(workerCorrectness)
    const allSamplesConsistent = [...nodeRow.cold, ...nodeRow.warm].every((sample) => (
      JSON.stringify(correctness(sample.coreLayout)) === JSON.stringify(nodeCorrectness)
    )) && workerRow.allSamplesConsistent
    const coldCacheCorrect = nodeRow.cold.every((sample) => sample.coreLayout.measurement.cacheStatus === "miss")
      && workerRow.cold.every((sample) => sample.cacheStatus === "miss")
    const warmCacheCorrect = nodeRow.warm.every((sample) => sample.coreLayout.measurement.cacheStatus === "hit")
      && workerRow.warm.every((sample) => sample.cacheStatus === "hit")
    if (!normalizedExact || !coreLayoutExact || !allSamplesConsistent || !coldCacheCorrect || !warmCacheCorrect) {
      throw new Error(`Node/Worker XR-2 parity mismatch: ${nodeRow.rowId}`)
    }
    return {
      rowId: nodeRow.rowId,
      fixtureId: nodeRow.fixtureId,
      scenarioId: nodeRow.scenarioId,
      scale: nodeRow.scale,
      textLength: nodeRow.textLength,
      geometry: nodeRow.geometry,
      status: "matched",
      parity: {
        normalizedEngineResultExact: normalizedExact,
        coreLineGeometryAndPaginationExact: coreLayoutExact,
        allRepeatedSamplesConsistent: allSamplesConsistent,
        coldCacheMissesExact: coldCacheCorrect,
        warmCacheHitsExact: warmCacheCorrect,
        normalizedResultSha256: digest(nodeRow.normalizedResult),
        coreCorrectnessSha256: digest(nodeCorrectness),
      },
      correctness: nodeCorrectness,
      node: {
        runtimeIdentity: nodeRow.nodeRuntimeIdentity,
        cold: summarizeNode(nodeRow.cold),
        warm: summarizeNode(nodeRow.warm),
      },
      browserWorker: {
        cold: summarizeWorker(workerRow.cold),
        warm: summarizeWorker(workerRow.warm),
      },
    }
  })
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-xr2-one-block-performance-parity-v1",
    status: "observed-bounded-parity-no-budget",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      realBrowserWorker: true,
      nodeNativeRustybuzz: true,
      nodeNativeIcu4x: true,
      workerWasmRustybuzz: true,
      workerWasmIcu4x: true,
      injectedCoreRendererBackedMeasurer: true,
      coreMeasuredLineAcceptance: true,
      coreBoundedTextFlowPagination: true,
    },
    identity: runtime.FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
    workerRuntimeIdentity: browser.output.runtimeIdentity,
    samples: {
      coldPerRow: runtime.FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT,
      warmPerRow: runtime.FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT,
    },
    browserInitialization: {
      assetFetchDurationMs: browser.output.assetFetchDurationMs,
      workerInitializationRoundTripMs: browser.output.initializationRoundTripMs,
      workerInitializationDurationMs: browser.output.initializationDurationMs,
    },
    rows,
    interpretation: {
      performanceBudgetDefined: false,
      measurementsAreObservational: true,
      cacheHitAvoidsEngineProvider: rows.every((row) => (
        row.node.warm.providerInvocationCount === 0 && row.browserWorker.warm.providerInvocationCount === 0
      )),
      boundedWorkloadParityOnly: true,
    },
    scope: {
      productionBinding: false,
      defaultMeasurerReplacement: false,
      formBinding: false,
      editorUiBinding: false,
      backendRequestPerKeystroke: false,
      wholeDocumentIncrementalInvalidation: false,
      productionPerformanceClaim: false,
    },
  }
  writeFileSync(
    resolve(editorRoot, "src/fixtures/live-draft-xr2-one-block-performance-parity.v1.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  )
  process.stdout.write(`${evidence.evidenceId}: ${rows.length} rows matched; timings retained without a budget\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
