import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4187
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
        url: `http://127.0.0.1:${vitePort}/qa/live-draft-mr1-incremental-reflow-evidence.html`,
      })
      const deadline = Date.now() + 240_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const result = document.querySelector('#flowdoc-live-draft-mr1-incremental-reflow-result'); return result == null ? null : { status: result.dataset.status, text: result.textContent }; })()`,
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
          throw new Error(`browser MR1 incremental reflow evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser MR1 incremental reflow evidence timed out")
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

const phaseNames = [
  "input-and-style-resolution",
  "shaping",
  "segmentation",
  "line-breaking",
  "core-acceptance-and-fingerprint",
  "adapter-fingerprint",
]

const chromePath = process.env.FLOWDOC_CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-mr1-incremental-reflow-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const output = browser.output
  const backendLikeRequests = browser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  const expectedWindow = output.scenarios.filter((scenario) => (
    scenario.coverage !== "fallback" && scenario.coverage !== "end"
  ))
  const fallbacks = output.scenarios.filter((scenario) => (
    scenario.coverage === "fallback" || scenario.coverage === "end"
  ))
  const boundedCoverage = [...new Set(output.scenarios
    .filter((scenario) => scenario.coverage !== "fallback")
    .map((scenario) => scenario.coverage))].sort()
  const boundedAccepted = expectedWindow.length === 6
    && expectedWindow.every((scenario) => scenario.analysis.status === "window-proved")
    && expectedWindow.every((scenario) => scenario.analysis.work.exactIntegerGeometry === true)
    && output.scenarios.every((scenario) => scenario.oracleRepeatExact)
  const fallbackCodes = fallbacks.map((scenario) => scenario.analysis.fallback?.code).sort()
  const fallbackAccepted = fallbacks.length === 3
    && fallbacks.every((scenario) => scenario.analysis.status === "fallback-required")
    && fallbackCodes.includes("hard-break-edited")
    && fallbackCodes.filter((code) => code === "reconvergence-not-found").length === 2
  const phaseSamples = Object.fromEntries(phaseNames.map((phase) => [
    phase,
    output.scenarios.flatMap((scenario) => scenario.phaseDurationMs.map((sample) => sample[phase])),
  ]))
  const phaseTiming = Object.fromEntries(Object.entries(phaseSamples).map(([phase, samples]) => [
    phase,
    distribution(samples),
  ]))
  const fullLayoutTiming = distribution(output.scenarios.flatMap((scenario) => scenario.fullLayoutDurationMs))
  const oracleAnalysisTiming = distribution(output.scenarios.map((scenario) => scenario.analysisDurationMs))
  const tokenImpactTiming = distribution(output.tokenImpactDurationMs)
  const profileComplete = Object.values(phaseSamples).every((samples) => (
    samples.length === output.scenarios.length * 10 && samples.every((value) => Number.isFinite(value) && value >= 0)
  ))
  if (
    output.baseline.profile.work.renderedUtf16Length !== 4_959
    || output.baseline.profile.work.lineCount < 100
    || boundedCoverage.join(",") !== "end,field-adjacency,line-edge,middle,page-edge,start,style-boundary"
    || !boundedAccepted
    || !fallbackAccepted
    || !profileComplete
    || backendLikeRequests.length > 0
  ) throw new Error(`MR1 incremental reflow acceptance mismatch: ${JSON.stringify({
    baselineWork: output.baseline.profile.work,
    boundedCoverage,
    boundedAccepted,
    fallbackCodes,
    fallbackAccepted,
    profileComplete,
    analyses: output.scenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId,
      status: scenario.analysis.status,
      fallback: scenario.analysis.fallback,
      work: scenario.analysis.work,
    })),
    backendRequestCount: backendLikeRequests.length,
  })}`)

  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-incremental-reflow-analysis-v1",
    status: "accepted-oracle-only-incremental-window",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      realChromeWorkerWasm: true,
      fullLayoutOracleExecuted: true,
      diagnosticPhaseTiming: true,
      boundedScenarioCount: expectedWindow.length,
      fallbackScenarioCount: fallbacks.length,
      warmSamplesPerScenario: 10,
      backendRequestCount: backendLikeRequests.length,
      incrementalWindowMayPublishLayout: false,
      partialShapingExecuted: false,
      productBinding: false,
      productionBinding: false,
    },
    identity: {
      wasmSha256: output.identity.wasmSha256,
      measurementProfileId: output.identity.measurementProfileId,
      workerBoundaryVersion: output.identity.boundaryVersion,
      fontSha256ById: output.identity.fontSha256ById,
      baselineLayoutFingerprint: output.baseline.layoutFingerprint,
      baselineCoreLayoutFingerprint: output.baseline.coreLayoutFingerprint,
    },
    baseline: output.baseline.profile.work,
    outcome: {
      boundedCoverage,
      boundedAccepted,
      fallbackAccepted,
      fallbackCodes,
      tokenImpact: output.tokenImpact,
      scenarios: output.scenarios.map((scenario) => ({
        scenarioId: scenario.scenarioId,
        coverage: scenario.coverage,
        edit: scenario.edit,
        oracleFingerprint: scenario.oracleFingerprint,
        oracleCoreFingerprint: scenario.oracleCoreFingerprint,
        oracleRepeatExact: scenario.oracleRepeatExact,
        profileWork: scenario.work,
        analysis: scenario.analysis,
      })),
    },
    timing: {
      interactionReferenceMs: 16.7,
      fullLayout: fullLayoutTiming,
      phases: phaseTiming,
      oracleAnalysis: oracleAnalysisTiming,
      tokenImpact: tokenImpactTiming,
      baselineFullLayoutMs: output.baseline.profile.totalDurationMs,
      assetFetchDurationMs: output.assetFetchDurationMs,
      workerRoundTripMs: output.workerRoundTripMs,
      timingIsDiagnosticOnly: true,
      productFrameGateClaimed: false,
    },
    contracts: output.contracts,
    scope: {
      textBlockOnly: true,
      mixedSizeAndWeightRuns: true,
      resolvedFieldAdjacency: true,
      lineAndPageEdges: true,
      exactIntegerOracleComparison: true,
      actualIncrementalShaping: false,
      actualIncrementalCoreAcceptance: false,
      tables: false,
      columns: false,
      images: false,
      autoFitColumnWidth: false,
      productBinding: false,
      backendBinding: false,
      productionBinding: false,
    },
  }
  const outputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-incremental-reflow-analysis.v1.json")
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    baseline: evidence.baseline,
    timing: evidence.timing,
    scenarioWork: evidence.outcome.scenarios.map((scenario) => ({
      scenarioId: scenario.scenarioId,
      status: scenario.analysis.status,
      fallback: scenario.analysis.fallback?.code ?? null,
      work: scenario.analysis.work,
    })),
  }, null, 2)}\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
