import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4183
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

async function runBrowserXr5(chromePath, profileRoot) {
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
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${vitePort}/qa/live-draft-xr5-evidence.html` })
      const deadline = Date.now() + 180_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const target = document.querySelector('#flowdoc-live-draft-xr5-result'); return target == null ? null : { status: target.dataset.status, text: target.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") return { output: JSON.parse(value.text), browserVersion: version.product }
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser XR5 evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser XR5 evidence timed out")
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
  const { cacheStatus: _cacheStatus, ...measurement } = layout.measurement
  return {
    contractVersion: layout.contractVersion,
    measurement,
    acceptanceSummary: layout.acceptanceSummary,
    pagination: layout.pagination,
    displayList: layout.displayList,
  }
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

function maxNumericDrift(left, right) {
  const leftValues = numericLeaves(left)
  const rightValues = numericLeaves(right)
  if (leftValues.size !== rightValues.size) throw new Error("numeric drift shape mismatch")
  let maximum = 0
  for (const [path, leftValue] of leftValues) {
    if (!rightValues.has(path)) throw new Error(`numeric drift path mismatch: ${path}`)
    maximum = Math.max(maximum, Math.abs(leftValue - rightValues.get(path)))
  }
  return maximum
}

function firstDifference(left, right, path = "root") {
  if (Object.is(left, right)) return null
  if (typeof left !== typeof right || left == null || right == null) return { path, left, right }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return { path, left, right }
    for (let index = 0; index < left.length; index += 1) {
      const difference = firstDifference(left[index], right[index], `${path}[${index}]`)
      if (difference != null) return difference
    }
    return null
  }
  if (typeof left === "object") {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
    for (const key of keys) {
      const difference = firstDifference(left[key], right[key], `${path}.${key}`)
      if (difference != null) return difference
    }
    return null
  }
  return { path, left, right }
}

function summarizeSample(sample, runtime) {
  return runtime === "node"
    ? {
        totalDurationMs: sample.totalDurationMs,
        providerInvoked: sample.coreLayout.timings.providerInvoked,
        providerMs: sample.coreLayout.timings.providerMs,
        measurementMs: sample.coreLayout.timings.measurementMs,
        acceptanceMs: sample.coreLayout.timings.acceptanceMs,
        paginationMs: sample.coreLayout.timings.paginationMs,
        coreBoundaryMs: sample.coreLayout.timings.coreBoundaryMs,
        cacheStatus: sample.coreLayout.measurement.cacheStatus,
      }
    : {
        roundTripMs: sample.roundTripMs,
        workerDurationMs: sample.workerDurationMs,
        providerInvoked: sample.timings.providerInvoked,
        providerMs: sample.timings.providerMs,
        measurementMs: sample.timings.measurementMs,
        acceptanceMs: sample.timings.acceptanceMs,
        paginationMs: sample.timings.paginationMs,
        coreBoundaryMs: sample.timings.coreBoundaryMs,
        cacheStatus: sample.cacheStatus,
      }
}

function sourceSegments(layout) {
  return layout.displayList.commands.flatMap((command) => command.sourceSegments ?? [])
}

function assertRowExpectation(nodeRow, correctnessValue) {
  const { measurement, pagination, displayList } = correctnessValue
  if (measurement.lineBoxes.length < nodeRow.expected.minimumLineCount) {
    throw new Error(`XR5 minimum line count failed: ${nodeRow.rowId}`)
  }
  if (pagination.summary.pageCount < nodeRow.expected.minimumPageCount) {
    throw new Error(`XR5 minimum page count failed: ${nodeRow.rowId}`)
  }
  if (displayList == null || displayList.status !== "ready") {
    throw new Error(`XR5 display list missing: ${nodeRow.rowId}`)
  }
  if (displayList.summary.commandCount !== measurement.lineBoxes.length) {
    throw new Error(`XR5 line/command count mismatch: ${nodeRow.rowId}`)
  }
  if (nodeRow.expected.requiresMixedThaiLatin === true) {
    const text = measurement.lineBoxes.map((line) => line.text).join("")
    if (!/\p{Script=Thai}/u.test(text) || !/[A-Za-z]/u.test(text)) {
      throw new Error(`XR5 mixed-script evidence missing: ${nodeRow.rowId}`)
    }
  }
  if (nodeRow.expected.requiredFontId != null && !displayList.commands.every((command) => (
    command.style.fontId === nodeRow.expected.requiredFontId
  ))) throw new Error(`XR5 style/font mapping mismatch: ${nodeRow.rowId}`)
  if (nodeRow.expected.requiredFieldKey != null && !sourceSegments(correctnessValue).some((segment) => (
    segment.kind === "resolved-field" && segment.fieldKey === nodeRow.expected.requiredFieldKey
  ))) throw new Error(`XR5 resolved-field source segment missing: ${nodeRow.rowId}`)
  if (nodeRow.expected.requiresHardBreakSegment === true && !sourceSegments(correctnessValue).some((segment) => (
    segment.kind === "hard-break" && segment.renderedText === "\n"
  ))) throw new Error(`XR5 hard-break source segment missing: ${nodeRow.rowId}`)
}

const chromePath = process.env.FLOWDOC_CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-xr5-"))

try {
  await server.listen()
  const browser = await runBrowserXr5(chromePath, profileRoot)
  const runtime = await server.ssrLoadModule("/scripts/run-live-draft-xr5-matrix-runtime.ts")
  const nodeRows = runtime.runNodeXr5Rows()
  if (nodeRows.length !== browser.output.rows.length) throw new Error("Node/Worker XR5 row count mismatch")
  const rows = nodeRows.map((nodeRow, index) => {
    const workerRow = browser.output.rows[index]
    if (nodeRow.rowId !== workerRow.rowId) throw new Error(`Node/Worker XR5 row mismatch: ${nodeRow.rowId}`)
    const nodeCorrectness = correctness(nodeRow.cold.coreLayout)
    const workerCorrectness = correctness(workerRow.reference.coreLayout)
    const normalizedExact = JSON.stringify(nodeRow.normalizedResult) === JSON.stringify(workerRow.reference.measurement)
    const lineAndPageExact = JSON.stringify({
      measurement: nodeCorrectness.measurement,
      acceptanceSummary: nodeCorrectness.acceptanceSummary,
      pagination: nodeCorrectness.pagination,
    }) === JSON.stringify({
      measurement: workerCorrectness.measurement,
      acceptanceSummary: workerCorrectness.acceptanceSummary,
      pagination: workerCorrectness.pagination,
    })
    const displayListExact = JSON.stringify(nodeCorrectness.displayList) === JSON.stringify(workerCorrectness.displayList)
    const repeatedSamplesExact = JSON.stringify(correctness(nodeRow.warm.coreLayout)) === JSON.stringify(nodeCorrectness)
      && workerRow.samplesConsistent
    const cachePolicyExact = nodeRow.cold.coreLayout.measurement.cacheStatus === "miss"
      && workerRow.cold.cacheStatus === "miss"
      && nodeRow.warm.coreLayout.measurement.cacheStatus === "hit"
      && workerRow.warm.cacheStatus === "hit"
      && nodeRow.warm.coreLayout.timings.providerInvoked === false
      && workerRow.warm.timings.providerInvoked === false
    const drift = {
      normalizedEngineMaxAbs: maxNumericDrift(nodeRow.normalizedResult, workerRow.reference.measurement),
      coreLineAndPageMaxAbsPt: maxNumericDrift({
        measurement: nodeCorrectness.measurement,
        pagination: nodeCorrectness.pagination,
      }, {
        measurement: workerCorrectness.measurement,
        pagination: workerCorrectness.pagination,
      }),
      displayListMaxAbsPt: maxNumericDrift(nodeCorrectness.displayList, workerCorrectness.displayList),
    }
    const driftAccepted = drift.normalizedEngineMaxAbs <= runtime.FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1.numericEngineFactMaxAbsDrift
      && drift.coreLineAndPageMaxAbsPt <= runtime.FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1.numericPointMaxAbsDrift
      && drift.displayListMaxAbsPt <= runtime.FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1.numericPointMaxAbsDrift
    if (!normalizedExact || !lineAndPageExact || !displayListExact || !repeatedSamplesExact || !cachePolicyExact || !driftAccepted) {
      throw new Error(`Node/Worker XR5 parity mismatch: ${nodeRow.rowId} ${JSON.stringify({
        normalizedExact,
        lineAndPageExact,
        displayListExact,
        repeatedSamplesExact,
        cachePolicyExact,
        driftAccepted,
        drift,
        coreDifference: firstDifference(nodeCorrectness, workerCorrectness),
      })}`)
    }
    assertRowExpectation(nodeRow, nodeCorrectness)
    return {
      rowId: nodeRow.rowId,
      fixtureId: nodeRow.fixtureId,
      scenarioId: nodeRow.scenarioId,
      coverage: nodeRow.coverage,
      status: "accepted-xr5-bounded",
      textLength: nodeRow.textLength,
      fontId: nodeRow.fontId,
      styleKey: nodeRow.styleKey,
      geometry: nodeRow.geometry,
      outcome: {
        lineCount: nodeCorrectness.measurement.lineBoxes.length,
        pageCount: nodeCorrectness.pagination.summary.pageCount,
        commandCount: nodeCorrectness.displayList.summary.commandCount,
        sourceSegmentCount: sourceSegments(nodeCorrectness).length,
      },
      parity: {
        normalizedEngineResultExact: normalizedExact,
        coreLineAndPageGeometryExact: lineAndPageExact,
        displayListCommandsExact: displayListExact,
        repeatedSamplesExact,
        cachePolicyExact,
        normalizedResultSha256: digest(nodeRow.normalizedResult),
        coreCorrectnessSha256: digest(nodeCorrectness),
        displayListSha256: digest(nodeCorrectness.displayList),
      },
      drift: { ...drift, status: "accepted" },
      correctness: nodeCorrectness,
      node: {
        runtimeIdentity: nodeRow.nodeRuntimeIdentity,
        cold: summarizeSample(nodeRow.cold, "node"),
        warm: summarizeSample(nodeRow.warm, "node"),
      },
      browserWorker: {
        cold: summarizeSample(workerRow.cold, "worker"),
        warm: summarizeSample(workerRow.warm, "worker"),
      },
    }
  })

  const narrow = rows.find((row) => row.scenarioId === "line-wrap-narrow-24pt")
  const wide = rows.find((row) => row.scenarioId === "line-wrap-wide-10000pt")
  if (narrow == null || wide == null
    || narrow.parity.normalizedResultSha256 !== wide.parity.normalizedResultSha256
    || narrow.outcome.lineCount <= wide.outcome.lineCount
    || wide.outcome.lineCount !== 1) {
    throw new Error("XR5 narrow/wide relationship evidence failed")
  }

  const fixtureIds = [...new Set(rows.map((row) => row.fixtureId))].sort()
  const maximumDrift = {
    normalizedEngineMaxAbs: Math.max(...rows.map((row) => row.drift.normalizedEngineMaxAbs)),
    coreLineAndPageMaxAbsPt: Math.max(...rows.map((row) => row.drift.coreLineAndPageMaxAbsPt)),
    displayListMaxAbsPt: Math.max(...rows.map((row) => row.drift.displayListMaxAbsPt)),
  }
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-xr5-cross-runtime-matrix-v1",
    status: "partial-release-matrix-accepted-with-explicit-blockers",
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
      coreDisplayListProjection: true,
      sourceRunProjection: true,
    },
    identity: runtime.FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
    workerRuntimeIdentity: browser.output.runtimeIdentity,
    samples: runtime.FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT,
    browserInitialization: {
      assetFetchDurationMs: browser.output.assetFetchDurationMs,
      workerInitializationRoundTripMs: browser.output.initializationRoundTripMs,
      workerInitializationDurationMs: browser.output.initializationDurationMs,
    },
    driftPolicy: runtime.FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1,
    crossRuntimeDriftSummary: {
      status: "accepted-for-xr5-node-browser-renderer-backed-comparison",
      ...maximumDrift,
      defaultApproximateMeasurerCompared: false,
      satisfiesV1RendererBackedApproximateDriftFixture: false,
    },
    digestParitySummary: {
      status: "matched-xr5-runtime-context",
      measurementProfileMatch: runtime.FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId
        === browser.output.runtimeIdentity.measurementProfileId,
      wasmDigestMatch: runtime.FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256
        === browser.output.runtimeIdentity.wasmSha256,
      fontDigestsMatch: rows.every((row) => (
        browser.output.runtimeIdentity.fontSha256ById[row.fontId]
        === runtime.FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1.find((candidate) => candidate.rowId === row.rowId).fontSha256
      )),
      normalizedRowsExact: rows.every((row) => row.parity.normalizedEngineResultExact),
      fixtureId: "v1-measure-digest-parity-summary",
    },
    matrix: {
      inheritedAcceptedPrerequisites: [
        "v1-measure-thai-line-break-core",
        "v1-measure-latin-product-paragraphs",
      ],
      executedFixtureIds: fixtureIds,
      executedRowCount: rows.length,
      blockedRowCount: runtime.FLOWDOC_LIVE_DRAFT_XR5_BLOCKED_ROWS_V1.length,
      releaseGatingStatus: "partial-not-accepted",
      generalCrossRuntimeExactnessClaim: false,
    },
    rows,
    blockedRows: runtime.FLOWDOC_LIVE_DRAFT_XR5_BLOCKED_ROWS_V1,
    interpretation: {
      performanceBudgetDefined: false,
      measurementsAreObservational: true,
      acceptedRowsAreBounded: true,
      blockedRowsRetained: true,
      browserAndNodeRendererBackedGeometryMatches: true,
      approximateDefaultDriftStillBlocked: true,
      wholeDocumentExactnessClaim: false,
      glyphPixelExactnessClaim: false,
    },
    scope: {
      productionBinding: false,
      defaultMeasurerReplacement: false,
      wholeDocumentComposition: false,
      tableComposition: false,
      repeatedHeaders: false,
      mixedFontInlineShaping: false,
      editorUiBinding: false,
      backendRequestPerKeystroke: false,
      glyphPixelParity: false,
    },
  }
  if (process.env.FLOWDOC_EVIDENCE_WRITE !== "0") {
    writeFileSync(
      resolve(editorRoot, "src/fixtures/live-draft-xr5-cross-runtime-matrix.v1.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    )
  }
  process.stdout.write(`${evidence.evidenceId}: ${rows.length} rows accepted, ${evidence.blockedRows.length} blockers retained\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
