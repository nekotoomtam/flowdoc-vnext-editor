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

async function runBrowser(chromePath, profileRoot, target) {
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
      await cdp.send("Page.navigate", { url: `http://127.0.0.1:${vitePort}${target.pagePath}` })
      const deadline = Date.now() + 180_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const result = document.querySelector(${JSON.stringify(target.resultSelector)}); return result == null ? null : { status: result.dataset.status, text: result.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") {
          let canvasPixels = null
          if (target.canvasSelector != null) {
            const pixels = await cdp.send("Runtime.evaluate", {
              expression: `(() => {
                const canvas = document.querySelector(${JSON.stringify(target.canvasSelector)});
                if (!(canvas instanceof HTMLCanvasElement)) throw new Error('MR1 Canvas is missing');
                const context = canvas.getContext('2d');
                if (context == null) throw new Error('MR1 Canvas context is missing');
                const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
                let nonWhitePixelCount = 0;
                for (let index = 0; index < data.length; index += 4) {
                  if (data[index] < 248 || data[index + 1] < 248 || data[index + 2] < 248) nonWhitePixelCount += 1;
                }
                return {
                  nonWhitePixelCount,
                  pngDataUrl: canvas.toDataURL('image/png'),
                  widthPx: canvas.width,
                  heightPx: canvas.height,
                  paintStatus: canvas.dataset.paintStatus ?? null,
                  displayListFingerprint: canvas.dataset.displayListFingerprint ?? null,
                };
              })()`,
              returnByValue: true,
            })
            canvasPixels = pixels.result?.value ?? null
          }
          return { output: JSON.parse(value.text), browserVersion: version.product, requests, canvasPixels }
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
  const browser = await runBrowser(chromePath, profileRoot, {
    pagePath: "/qa/live-draft-mr1-evidence.html",
    resultSelector: "#flowdoc-live-draft-mr1-result",
  })
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
  const canvasBrowser = await runBrowser(chromePath, profileRoot, {
    pagePath: "/qa/live-draft-mr1-canvas-evidence.html",
    resultSelector: "#flowdoc-live-draft-mr1-canvas-result",
    canvasSelector: "#flowdoc-live-draft-mr1-canvas",
  })
  if (
    node.displayList == null
    || canvasBrowser.output.result.status !== "accepted"
    || canvasBrowser.output.displayList.status !== "ready"
    || canvasBrowser.canvasPixels == null
  ) throw new Error("MR1 Canvas evidence did not produce accepted layout, display-list, and pixels")
  const canvasLayoutExact = JSON.stringify(node.result.layout) === JSON.stringify(canvasBrowser.output.result.layout)
  const canvasDisplayListExact = JSON.stringify(node.displayList) === JSON.stringify(canvasBrowser.output.displayList)
  const canvasLayoutDrift = maximumNumericDrift(node.result.layout, canvasBrowser.output.result.layout)
  const canvasDisplayListDrift = maximumNumericDrift(node.displayList, canvasBrowser.output.displayList)
  const commands = canvasBrowser.output.displayList.commands
  const commandFontFaceIds = commands.map((command) => command.style.fontFaceId)
  const commandFontSizes = commands.map((command) => command.style.fontSizeLayoutUnit)
  const commandFontWeights = commands.map((command) => command.style.fontWeight)
  const baselineYLayoutUnits = [...new Set(commands.map((command) => command.baselineYLayoutUnit))]
  const baselineXLayoutUnits = commands.map((command) => command.baselineXLayoutUnit)
  const fieldRetainedInCommand = commands.some((command) => command.sourceSegments.some((segment) => (
    segment.kind === "resolved-field" && segment.fieldKey === "customer.initial"
  )))
  const commandStylesAccepted = JSON.stringify(commandFontFaceIds)
      === JSON.stringify(["sarabun-regular", "sarabun-bold", "sarabun-regular"])
    && JSON.stringify(commandFontSizes) === JSON.stringify([10_000_000, 24_000_000, 12_000_000])
    && JSON.stringify(commandFontWeights) === JSON.stringify([400, 700, 400])
  const canvasBaselineAccepted = baselineYLayoutUnits.length === 1
    && baselineYLayoutUnits[0] === 97_632_000
    && baselineXLayoutUnits[0] === 72_000_000
    && baselineXLayoutUnits.every((value, index) => index === 0 || value > baselineXLayoutUnits[index - 1])
  const rendererBoundariesAccepted = canvasBrowser.output.paint.rendererMeasuredText === false
    && canvasBrowser.output.paint.rendererRelayout === false
    && canvasBrowser.output.displayList.contracts.rendererMayMeasureText === false
    && canvasBrowser.output.displayList.contracts.rendererMayRelayout === false
  const pixelsAccepted = canvasBrowser.canvasPixels.paintStatus === "painted"
    && canvasBrowser.canvasPixels.nonWhitePixelCount > 100
    && canvasBrowser.canvasPixels.displayListFingerprint === canvasBrowser.output.displayList.fingerprint
  const canvasBackendLikeRequests = canvasBrowser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  if (
    !canvasLayoutExact
    || !canvasDisplayListExact
    || canvasLayoutDrift !== 0
    || canvasDisplayListDrift !== 0
    || !commandStylesAccepted
    || !canvasBaselineAccepted
    || !fieldRetainedInCommand
    || !rendererBoundariesAccepted
    || !pixelsAccepted
    || canvasBackendLikeRequests.length > 0
  ) throw new Error(`MR1 Canvas acceptance mismatch: ${JSON.stringify({
    canvasLayoutExact,
    canvasDisplayListExact,
    canvasLayoutDrift,
    canvasDisplayListDrift,
    commandStylesAccepted,
    baselineAccepted: canvasBaselineAccepted,
    fieldRetainedInCommand,
    rendererBoundariesAccepted,
    pixelsAccepted,
    backendRequestCount: canvasBackendLikeRequests.length,
  })}`)

  const canvasEvidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-multi-run-canvas-paint-v1",
    status: "accepted-bounded-multi-run-canvas-paint",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: canvasBrowser.browserVersion,
    },
    execution: {
      nodeNativeLayout: true,
      realChromeWorkerLayout: true,
      coreFragmentDisplayListProjection: true,
      realChromeCanvasPaint: true,
      rendererMeasuredText: false,
      rendererRelayout: false,
      editorProductBinding: false,
      productionBinding: false,
      backendRequestCount: canvasBackendLikeRequests.length,
    },
    identity: {
      wasmSha256: runtime.FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
      measurementProfileId: node.identity.measurementProfileId,
      workerBoundaryVersion: canvasBrowser.output.identity.boundaryVersion,
      fontSha256ById: canvasBrowser.output.identity.fontSha256ById,
      layoutFingerprint: canvasBrowser.output.result.layout.fingerprint,
      displayListFingerprint: canvasBrowser.output.displayList.fingerprint,
    },
    parity: {
      layoutExact: canvasLayoutExact,
      displayListExact: canvasDisplayListExact,
      layoutMaximumIntegerDrift: canvasLayoutDrift,
      displayListMaximumIntegerDrift: canvasDisplayListDrift,
      nodeLayoutSha256: digest(node.result.layout),
      browserLayoutSha256: digest(canvasBrowser.output.result.layout),
      nodeDisplayListSha256: digest(node.displayList),
      browserDisplayListSha256: digest(canvasBrowser.output.displayList),
    },
    outcome: {
      lineCount: canvasBrowser.output.displayList.summary.lineCount,
      commandCount: canvasBrowser.output.displayList.summary.commandCount,
      nonBlankCommandCount: canvasBrowser.output.displayList.summary.nonBlankCommandCount,
      commandFontFaceIds,
      commandFontSizesLayoutUnit: commandFontSizes,
      commandFontWeights,
      baselineXLayoutUnits,
      baselineYLayoutUnits,
      fieldRetainedInCommand,
      fontReadiness: canvasBrowser.output.fontReadiness,
      canvasWidthPx: canvasBrowser.canvasPixels.widthPx,
      canvasHeightPx: canvasBrowser.canvasPixels.heightPx,
      nonWhitePixelCount: canvasBrowser.canvasPixels.nonWhitePixelCount,
      pngSha256: createHash("sha256").update(canvasBrowser.canvasPixels.pngDataUrl).digest("hex"),
    },
    timing: {
      observationalNoBudget: true,
      assetFetchDurationMs: canvasBrowser.output.assetFetchDurationMs,
      fontReadinessDurationMs: canvasBrowser.output.fontReadinessDurationMs,
      workerRoundTripMs: canvasBrowser.output.workerRoundTripMs,
      workerDurationMs: canvasBrowser.output.workerDurationMs,
      initializationDurationMs: canvasBrowser.output.initializationDurationMs,
      coldLayoutDurationMs: canvasBrowser.output.coldLayoutDurationMs,
      projectionDurationMs: canvasBrowser.output.projectionDurationMs,
      paintDurationMs: canvasBrowser.output.paint.paintDurationMs,
      nodeDurationMs: node.durationMs,
    },
    scope: {
      oneTextBlock: true,
      mixedSizeOneLine: true,
      realBrowserWorkerParity: true,
      coreFragmentDisplayList: true,
      qaCanvasPaint: true,
      productCanvasBinding: false,
      backendBinding: false,
      defaultMeasurerReplacement: false,
      wholeDocumentComposition: false,
      productionBinding: false,
      glyphPixelParity: false,
    },
  }
  const multiLineNode = runtime.runNodeMr1MultiLineEvidence()
  const multiLineBrowser = await runBrowser(chromePath, profileRoot, {
    pagePath: "/qa/live-draft-mr1-multiline-evidence.html",
    resultSelector: "#flowdoc-live-draft-mr1-multiline-result",
    canvasSelector: "#flowdoc-live-draft-mr1-multiline-canvas",
  })
  if (
    multiLineNode.result.status !== "accepted"
    || multiLineNode.displayList == null
    || multiLineBrowser.output.result.status !== "accepted"
    || multiLineBrowser.output.displayList.status !== "ready"
    || multiLineBrowser.canvasPixels == null
  ) throw new Error("MR1 multiline evidence did not produce accepted layout, display-list, and pixels")

  const multiLineRequestExact = JSON.stringify(multiLineNode.result.request)
    === JSON.stringify(multiLineBrowser.output.result.request)
  const multiLineLayoutExact = JSON.stringify(multiLineNode.result.layout)
    === JSON.stringify(multiLineBrowser.output.result.layout)
  const multiLineDisplayListExact = JSON.stringify(multiLineNode.displayList)
    === JSON.stringify(multiLineBrowser.output.displayList)
  const multiLineRequestDrift = maximumNumericDrift(
    multiLineNode.result.request,
    multiLineBrowser.output.result.request,
  )
  const multiLineLayoutDrift = maximumNumericDrift(
    multiLineNode.result.layout,
    multiLineBrowser.output.result.layout,
  )
  const multiLineDisplayListDrift = maximumNumericDrift(
    multiLineNode.displayList,
    multiLineBrowser.output.displayList,
  )
  const multiLineCommands = multiLineBrowser.output.displayList.commands
  const multiLineCommandTexts = multiLineCommands.map((command) => command.text)
  const multiLineCommandLineIndexes = multiLineCommands.map((command) => command.lineIndex)
  const multiLineBaselineYLayoutUnits = [
    ...new Set(multiLineCommands.map((command) => command.baselineYLayoutUnit)),
  ]
  const multiLineFontFaceIds = [...new Set(
    multiLineCommands.map((command) => command.style.fontFaceId),
  )]
  const multiLineFontSizes = [...new Set(
    multiLineCommands.map((command) => command.style.fontSizeLayoutUnit),
  )].sort((left, right) => left - right)
  const multiLineFontWeights = [...new Set(
    multiLineCommands.map((command) => command.style.fontWeight),
  )].sort((left, right) => left - right)
  const shapingRunLines = new Map()
  for (const command of multiLineCommands) {
    const lineIndexes = shapingRunLines.get(command.shapingRunId) ?? new Set()
    lineIndexes.add(command.lineIndex)
    shapingRunLines.set(command.shapingRunId, lineIndexes)
  }
  const shapingRunSplitAcrossLines = [...shapingRunLines.values()].some(
    (lineIndexes) => lineIndexes.size > 1,
  )
  const multiLineFieldRetained = multiLineCommands.some((command) => command.sourceSegments.some((segment) => (
    segment.kind === "resolved-field" && segment.fieldKey === "customer.displayName"
  )))
  const allCommandsMultiGlyph = multiLineCommands.every((command) => command.text.length > 1)
  const multiLineStructureAccepted = multiLineBrowser.output.displayList.summary.lineCount === 5
    && multiLineBrowser.output.displayList.summary.commandCount === 8
    && multiLineBrowser.output.displayList.summary.nonBlankCommandCount === 8
    && JSON.stringify([...new Set(multiLineCommandLineIndexes)]) === JSON.stringify([0, 1, 2, 3, 4])
    && JSON.stringify(multiLineBaselineYLayoutUnits)
      === JSON.stringify([97_632_000, 128_832_000, 160_032_000, 179_616_000, 196_780_000])
    && allCommandsMultiGlyph
    && shapingRunSplitAcrossLines
    && multiLineFieldRetained
  const multiLineStylesAccepted = JSON.stringify(multiLineFontFaceIds)
      === JSON.stringify(["sarabun-regular", "sarabun-bold"])
    && JSON.stringify(multiLineFontSizes) === JSON.stringify([10_000_000, 12_000_000, 24_000_000])
    && JSON.stringify(multiLineFontWeights) === JSON.stringify([400, 700])
  const multiLineRendererBoundariesAccepted = multiLineBrowser.output.paint.rendererMeasuredText === false
    && multiLineBrowser.output.paint.rendererRelayout === false
    && multiLineBrowser.output.displayList.contracts.rendererMayMeasureText === false
    && multiLineBrowser.output.displayList.contracts.rendererMayRelayout === false
  const multiLinePixelsAccepted = multiLineBrowser.canvasPixels.paintStatus === "painted"
    && multiLineBrowser.canvasPixels.nonWhitePixelCount > 1_000
    && multiLineBrowser.canvasPixels.displayListFingerprint
      === multiLineBrowser.output.displayList.fingerprint
  const multiLineBackendLikeRequests = multiLineBrowser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  const multiLineSamplesConsistent = multiLineBrowser.output.workerSamplesConsistent
    && multiLineBrowser.output.projectionSamplesConsistent
    && multiLineBrowser.output.paintSamplesConsistent
  if (
    !multiLineRequestExact
    || !multiLineLayoutExact
    || !multiLineDisplayListExact
    || multiLineRequestDrift !== 0
    || multiLineLayoutDrift !== 0
    || multiLineDisplayListDrift !== 0
    || !multiLineStructureAccepted
    || !multiLineStylesAccepted
    || !multiLineRendererBoundariesAccepted
    || !multiLinePixelsAccepted
    || !multiLineSamplesConsistent
    || multiLineBackendLikeRequests.length > 0
  ) throw new Error(`MR1 multiline Canvas acceptance mismatch: ${JSON.stringify({
    multiLineRequestExact,
    multiLineLayoutExact,
    multiLineDisplayListExact,
    multiLineRequestDrift,
    multiLineLayoutDrift,
    multiLineDisplayListDrift,
    multiLineStructureAccepted,
    multiLineStylesAccepted,
    multiLineRendererBoundariesAccepted,
    multiLinePixelsAccepted,
    multiLineSamplesConsistent,
    backendRequestCount: multiLineBackendLikeRequests.length,
  })}`)

  const multiLineEvidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-multiline-multi-glyph-canvas-v1",
    status: "accepted-bounded-multiline-multi-glyph-canvas",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: multiLineBrowser.browserVersion,
    },
    execution: {
      nodeNativeLayout: true,
      realChromeWorkerLayout: true,
      coreFragmentDisplayListProjection: true,
      realChromeCanvasPaint: true,
      workerWarmSampleCount: multiLineBrowser.output.warmLayoutDurationMs.length,
      projectionWarmSampleCount: multiLineBrowser.output.warmProjectionDurationMs.length,
      paintWarmSampleCount: multiLineBrowser.output.warmPaintDurationMs.length,
      rendererMeasuredText: false,
      rendererRelayout: false,
      editorProductBinding: false,
      productionBinding: false,
      backendRequestCount: multiLineBackendLikeRequests.length,
    },
    identity: {
      wasmSha256: runtime.FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
      measurementProfileId: multiLineNode.identity.measurementProfileId,
      workerBoundaryVersion: multiLineBrowser.output.identity.boundaryVersion,
      fontSha256ById: multiLineBrowser.output.identity.fontSha256ById,
      layoutFingerprint: multiLineBrowser.output.result.layout.fingerprint,
      displayListFingerprint: multiLineBrowser.output.displayList.fingerprint,
    },
    parity: {
      requestExact: multiLineRequestExact,
      layoutExact: multiLineLayoutExact,
      displayListExact: multiLineDisplayListExact,
      requestMaximumIntegerDrift: multiLineRequestDrift,
      layoutMaximumIntegerDrift: multiLineLayoutDrift,
      displayListMaximumIntegerDrift: multiLineDisplayListDrift,
      nodeRequestSha256: digest(multiLineNode.result.request),
      browserRequestSha256: digest(multiLineBrowser.output.result.request),
      nodeLayoutSha256: digest(multiLineNode.result.layout),
      browserLayoutSha256: digest(multiLineBrowser.output.result.layout),
      nodeDisplayListSha256: digest(multiLineNode.displayList),
      browserDisplayListSha256: digest(multiLineBrowser.output.displayList),
    },
    outcome: {
      renderedTextUtf16Length: multiLineBrowser.output.result.request.measurement.renderedText.length,
      shapingRunCount: multiLineBrowser.output.result.summary.shapingRunCount,
      clusterCount: multiLineBrowser.output.result.summary.clusterCount,
      lineCount: multiLineBrowser.output.displayList.summary.lineCount,
      commandCount: multiLineBrowser.output.displayList.summary.commandCount,
      nonBlankCommandCount: multiLineBrowser.output.displayList.summary.nonBlankCommandCount,
      commandTexts: multiLineCommandTexts,
      commandLineIndexes: multiLineCommandLineIndexes,
      baselineYLayoutUnits: multiLineBaselineYLayoutUnits,
      commandFontFaceIds: multiLineFontFaceIds,
      commandFontSizesLayoutUnit: multiLineFontSizes,
      commandFontWeights: multiLineFontWeights,
      allCommandsMultiGlyph,
      shapingRunSplitAcrossLines,
      fieldRetainedInCommand: multiLineFieldRetained,
      fontReadiness: multiLineBrowser.output.fontReadiness,
      canvasWidthPx: multiLineBrowser.canvasPixels.widthPx,
      canvasHeightPx: multiLineBrowser.canvasPixels.heightPx,
      nonWhitePixelCount: multiLineBrowser.canvasPixels.nonWhitePixelCount,
      pngSha256: createHash("sha256").update(multiLineBrowser.canvasPixels.pngDataUrl).digest("hex"),
    },
    timing: {
      observationalNoBudget: true,
      assetFetchDurationMs: multiLineBrowser.output.assetFetchDurationMs,
      fontReadinessDurationMs: multiLineBrowser.output.fontReadinessDurationMs,
      workerRoundTripMs: multiLineBrowser.output.workerRoundTripMs,
      workerDurationMs: multiLineBrowser.output.workerDurationMs,
      initializationDurationMs: multiLineBrowser.output.initializationDurationMs,
      coldLayoutDurationMs: multiLineBrowser.output.coldLayoutDurationMs,
      warmLayout: distribution(multiLineBrowser.output.warmLayoutDurationMs),
      projectionDurationMs: multiLineBrowser.output.projectionDurationMs,
      warmProjection: distribution(multiLineBrowser.output.warmProjectionDurationMs),
      paintDurationMs: multiLineBrowser.output.paint.paintDurationMs,
      warmPaint: distribution(multiLineBrowser.output.warmPaintDurationMs),
      samplesConsistent: multiLineSamplesConsistent,
      nodeDurationMs: multiLineNode.durationMs,
    },
    scope: {
      oneTextBlock: true,
      mixedSizeMultiLine: true,
      multiGlyphCommands: true,
      shapingRunSplitAcrossLines: true,
      resolvedFieldAcrossLines: true,
      realBrowserWorkerParity: true,
      coreFragmentDisplayList: true,
      qaCanvasPaint: true,
      productCanvasBinding: false,
      backendBinding: false,
      defaultMeasurerReplacement: false,
      wholeDocumentComposition: false,
      productionBinding: false,
      glyphPixelParity: false,
    },
  }
  const lifecycleBrowser = await runBrowser(chromePath, profileRoot, {
    pagePath: "/qa/live-draft-mr1-lifecycle-evidence.html",
    resultSelector: "#flowdoc-live-draft-mr1-lifecycle-result",
    canvasSelector: "#flowdoc-live-draft-mr1-lifecycle-canvas",
  })
  if (lifecycleBrowser.canvasPixels == null) {
    throw new Error("MR1 rapid-edit lifecycle did not produce Canvas pixels")
  }
  const lifecycle = lifecycleBrowser.output
  const initialFingerprint = lifecycle.initialCurrent.lastValidDisplayListFingerprint
  const newestFingerprint = lifecycle.newestCurrent.lastValidDisplayListFingerprint
  const finalFingerprint = lifecycle.finalCurrent.lastValidDisplayListFingerprint
  const lifecycleRequestsAccepted = JSON.stringify(lifecycle.requestedRevisions) === JSON.stringify([1, 4, 5, 7])
    && JSON.stringify(lifecycle.cancelledRevisions) === JSON.stringify([4])
    && JSON.stringify(lifecycle.paintedRevisions) === JSON.stringify([1, 5, 7])
  const coalescingAccepted = lifecycle.coalescedPending.phase === "draft-updating"
    && lifecycle.coalescedPending.pendingRevision === 4
    && lifecycle.coalescedPending.appliedRevision === 1
    && lifecycle.coalescedPending.lastValidRevision === 1
    && lifecycle.coalescedPending.lastValidDisplayListFingerprint === initialFingerprint
    && !lifecycle.requestedRevisions.includes(2)
    && !lifecycle.requestedRevisions.includes(3)
  const pendingRetainsLastValid = lifecycle.replacementPending.phase === "draft-updating"
    && lifecycle.replacementPending.pendingRevision === 5
    && lifecycle.replacementPending.appliedRevision === 1
    && lifecycle.replacementPending.lastValidRevision === 1
    && lifecycle.replacementPending.lastValidDisplayListFingerprint === initialFingerprint
  const staleCompletionRejected = lifecycle.newestCurrent.phase === "draft-current"
    && lifecycle.newestCurrent.appliedRevision === 5
    && lifecycle.afterLateObsolete.phase === "draft-current"
    && lifecycle.afterLateObsolete.appliedRevision === 5
    && lifecycle.afterLateObsolete.lastValidRevision === 5
    && lifecycle.afterLateObsolete.lastValidDisplayListFingerprint === newestFingerprint
    && lifecycle.afterLateObsolete.metrics.staleResultCount === 1
  const blockedRetainsLastValid = lifecycle.blockedWithLastValid.phase === "draft-blocked"
    && lifecycle.blockedWithLastValid.pendingRevision == null
    && lifecycle.blockedWithLastValid.appliedRevision === 5
    && lifecycle.blockedWithLastValid.lastValidRevision === 5
    && lifecycle.blockedWithLastValid.lastValidDisplayListFingerprint === newestFingerprint
  const recoveryAccepted = lifecycle.recoveryPending.phase === "draft-updating"
    && lifecycle.recoveryPending.pendingRevision === 7
    && lifecycle.recoveryPending.lastValidRevision === 5
    && lifecycle.recoveryPending.lastValidDisplayListFingerprint === newestFingerprint
    && lifecycle.finalCurrent.phase === "draft-current"
    && lifecycle.finalCurrent.pendingRevision == null
    && lifecycle.finalCurrent.appliedRevision === 7
    && lifecycle.finalCurrent.lastValidRevision === 7
    && lifecycle.finalCurrent.lastValidDisplayListFingerprint === finalFingerprint
  const lifecycleMetricsAccepted = JSON.stringify(lifecycle.finalCurrent.metrics) === JSON.stringify({
    scheduledCount: 6,
    requestCount: 4,
    appliedCount: 3,
    staleResultCount: 1,
    cancellationCount: 1,
    blockedCount: 1,
  })
  const lifecycleFingerprintsAccepted = [initialFingerprint, newestFingerprint, finalFingerprint]
    .every((value) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value))
    && new Set([initialFingerprint, newestFingerprint, finalFingerprint]).size === 3
    && JSON.stringify(lifecycle.paintedDisplayListFingerprints)
      === JSON.stringify([initialFingerprint, newestFingerprint, finalFingerprint])
    && lifecycle.finalDisplayListFingerprint === finalFingerprint
  const lifecycleRendererAccepted = lifecycle.contracts.debounceCoalescesUndispatchedRevisions
    && lifecycle.contracts.cancellationIsAdvisory
    && lifecycle.contracts.staleCompletionCannotPublish
    && lifecycle.contracts.lastValidRetainedWhilePending
    && lifecycle.contracts.lastValidRetainedWhileBlocked
    && lifecycle.contracts.canvasPaintsAcceptedLatestOnly
    && lifecycle.contracts.rendererMeasuredText === false
    && lifecycle.contracts.rendererRelayout === false
    && lifecycle.contracts.backendBinding === false
    && lifecycle.contracts.productBinding === false
  const lifecyclePixelsAccepted = lifecycleBrowser.canvasPixels.paintStatus === "painted"
    && lifecycleBrowser.canvasPixels.nonWhitePixelCount > 1_000
    && lifecycleBrowser.canvasPixels.displayListFingerprint === finalFingerprint
  const lifecycleBackendLikeRequests = lifecycleBrowser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  if (
    !lifecycleRequestsAccepted
    || !coalescingAccepted
    || !pendingRetainsLastValid
    || !staleCompletionRejected
    || !blockedRetainsLastValid
    || !recoveryAccepted
    || !lifecycleMetricsAccepted
    || !lifecycleFingerprintsAccepted
    || !lifecycleRendererAccepted
    || !lifecyclePixelsAccepted
    || lifecycleBackendLikeRequests.length > 0
  ) throw new Error(`MR1 rapid-edit lifecycle acceptance mismatch: ${JSON.stringify({
    lifecycleRequestsAccepted,
    coalescingAccepted,
    pendingRetainsLastValid,
    staleCompletionRejected,
    blockedRetainsLastValid,
    recoveryAccepted,
    lifecycleMetricsAccepted,
    lifecycleFingerprintsAccepted,
    lifecycleRendererAccepted,
    lifecyclePixelsAccepted,
    backendRequestCount: lifecycleBackendLikeRequests.length,
  })}`)

  const lifecycleEvidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-rapid-edit-lifecycle-v1",
    status: "accepted-bounded-latest-revision-last-valid",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: lifecycleBrowser.browserVersion,
    },
    execution: {
      realChromeWorkerWasm: true,
      initializedWorkerReused: true,
      coreFragmentDisplayListProjection: true,
      realChromeCanvasPaint: true,
      debounceMs: lifecycle.debounceMs,
      rendererMeasuredText: false,
      rendererRelayout: false,
      editorProductBinding: false,
      productionBinding: false,
      backendRequestCount: lifecycleBackendLikeRequests.length,
    },
    identity: {
      wasmSha256: lifecycle.diagnostics.wasmSha256,
      measurementProfileId: lifecycle.diagnostics.measurementProfileId,
      workerBoundaryVersion: lifecycle.diagnostics.boundaryVersion,
      fontSha256ById: lifecycle.diagnostics.fontSha256ById,
      initialDisplayListFingerprint: initialFingerprint,
      newestDisplayListFingerprint: newestFingerprint,
      finalDisplayListFingerprint: finalFingerprint,
    },
    outcome: {
      scheduledRevisions: [1, 2, 3, 4, 5, 7],
      requestedRevisions: lifecycle.requestedRevisions,
      coalescedBeforeDispatchRevisions: [2, 3],
      cancellationRequestedRevisions: lifecycle.cancelledRevisions,
      staleCompletionRevision: 4,
      appliedRevisions: lifecycle.paintedRevisions,
      initialCurrent: lifecycle.initialCurrent,
      coalescedPending: lifecycle.coalescedPending,
      replacementPending: lifecycle.replacementPending,
      newestCurrent: lifecycle.newestCurrent,
      afterLateObsolete: lifecycle.afterLateObsolete,
      blockedWithLastValid: lifecycle.blockedWithLastValid,
      recoveryPending: lifecycle.recoveryPending,
      finalCurrent: lifecycle.finalCurrent,
      stateTransitionCount: lifecycle.stateTransitions.length,
      finalCanvasWidthPx: lifecycleBrowser.canvasPixels.widthPx,
      finalCanvasHeightPx: lifecycleBrowser.canvasPixels.heightPx,
      finalNonWhitePixelCount: lifecycleBrowser.canvasPixels.nonWhitePixelCount,
      finalPngSha256: createHash("sha256").update(lifecycleBrowser.canvasPixels.pngDataUrl).digest("hex"),
    },
    timing: {
      observationalNoBudget: true,
      artificialResponseDelayMsByRevision: lifecycle.artificialResponseDelayMsByRevision,
      workerDurationMsByRevision: lifecycle.workerDurationMsByRevision,
      appliedEndToEndDurationMsByRevision: lifecycle.appliedEndToEndDurationMsByRevision,
      paintDurationMs: lifecycle.paintDurationMs,
      sequenceDurationMs: lifecycle.sequenceDurationMs,
    },
    contracts: lifecycle.contracts,
    scope: {
      oneTextBlock: true,
      rapidConsecutiveRevisions: true,
      debounceCoalescing: true,
      staleCompletionRejection: true,
      lastValidRetention: true,
      recoveryAfterBlockedInput: true,
      qaCanvasPaint: true,
      productCanvasBinding: false,
      backendBinding: false,
      wholeDocumentComposition: false,
      productionBinding: false,
      glyphPixelParity: false,
    },
  }
  const outputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-real-browser-worker-parity.v1.json")
  const canvasOutputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-multi-run-canvas-paint.v1.json")
  const multiLineOutputPath = resolve(
    editorRoot,
    "src/fixtures/live-draft-mr1-multiline-multi-glyph-canvas.v1.json",
  )
  const lifecycleOutputPath = resolve(
    editorRoot,
    "src/fixtures/live-draft-mr1-rapid-edit-lifecycle.v1.json",
  )
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  writeFileSync(canvasOutputPath, `${JSON.stringify(canvasEvidence, null, 2)}\n`, "utf8")
  writeFileSync(multiLineOutputPath, `${JSON.stringify(multiLineEvidence, null, 2)}\n`, "utf8")
  writeFileSync(lifecycleOutputPath, `${JSON.stringify(lifecycleEvidence, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    parity: evidence.parity,
    canvasOutputPath,
    canvasStatus: canvasEvidence.status,
    canvasParity: canvasEvidence.parity,
    multiLineOutputPath,
    multiLineStatus: multiLineEvidence.status,
    multiLineParity: multiLineEvidence.parity,
    multiLineTiming: multiLineEvidence.timing,
    lifecycleOutputPath,
    lifecycleStatus: lifecycleEvidence.status,
    lifecycleOutcome: {
      requestedRevisions: lifecycleEvidence.outcome.requestedRevisions,
      appliedRevisions: lifecycleEvidence.outcome.appliedRevisions,
      finalMetrics: lifecycleEvidence.outcome.finalCurrent.metrics,
    },
  }, null, 2)}\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
