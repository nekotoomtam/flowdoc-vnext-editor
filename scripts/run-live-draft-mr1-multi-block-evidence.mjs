import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4186
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
        url: `http://127.0.0.1:${vitePort}/qa/live-draft-mr1-multi-block-evidence.html`,
      })
      const deadline = Date.now() + 180_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const result = document.querySelector('#flowdoc-live-draft-mr1-multi-block-result'); return result == null ? null : { status: result.dataset.status, text: result.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") {
          const pixels = await cdp.send("Runtime.evaluate", {
            expression: `(() => {
              const canvas = document.querySelector('#flowdoc-live-draft-mr1-multi-block-canvas');
              if (!(canvas instanceof HTMLCanvasElement)) throw new Error('MR1 multi-block Canvas is missing');
              const context = canvas.getContext('2d');
              if (context == null) throw new Error('MR1 multi-block Canvas context is missing');
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
                pageCount: Number(canvas.dataset.pageCount ?? '0'),
              };
            })()`,
            returnByValue: true,
          })
          return {
            output: JSON.parse(value.text),
            browserVersion: version.product,
            requests,
            canvasPixels: pixels.result?.value,
          }
        }
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser MR1 multi-block evidence blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser MR1 multi-block evidence timed out")
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
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-mr1-multi-block-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const output = browser.output
  const backendLikeRequests = browser.requests.filter((url) => {
    const parsed = new URL(url)
    return /\/(?:api|pdf|preview|render|export)(?:\/|$)/iu.test(parsed.pathname)
  })
  const pageCreationAccepted = output.initial.pageCount === 2
    && output.expanded.pageCount === 3
    && output.contracted.pageCount === 2
  const pageRemovalAccepted = output.paintedPageCounts.includes(3)
    && output.paintedPageCounts.at(-1) === 2
  const incrementalReuseAccepted = output.sameGeometryChange.work.reusedPrefixBlockCount === 5
    && output.sameGeometryChange.work.recomposedBlockCount === 1
    && output.sameGeometryChange.work.reusedSuffixBlockCount === 6
    && output.sameGeometryChange.work.reconvergedAtBlockIndex === 6
    && output.sameGeometryChange.projectionWork.reusedLineCount === 11
    && output.sameGeometryChange.projectionWork.projectedLineCount === 1
    && output.sameGeometryChange.projectionWork.validatedLayoutCount === 1
  const schedulingAccepted = output.contracts.activeAndVisibleFirst
    && output.contracts.latestQueuedRevisionWins
    && output.contracts.staleCompletionCannotPublish
    && output.latestAfterStale.metrics.staleResultCount >= 1
    && output.latestAfterStale.metrics.coalescedCount >= 1
    && !output.paintedRevisions.includes(4)
    && !output.paintedRevisions.includes(5)
  const retentionAccepted = output.pendingRetains.lastValidFingerprint === output.contracted.lastValidFingerprint
    && output.replacementRetains.lastValidFingerprint === output.contracted.lastValidFingerprint
    && output.blockedRetains.lastValidFingerprint === output.latestAfterStale.lastValidFingerprint
  const rendererAccepted = output.contracts.coreOwnsPagination
    && output.contracts.canvasAtomicSwap
    && output.contracts.rendererMeasuredText === false
    && output.contracts.rendererRelayout === false
    && output.contracts.rendererPaginated === false
  const canvasAccepted = browser.canvasPixels.paintStatus === "painted"
    && browser.canvasPixels.nonWhitePixelCount > 1_000
    && browser.canvasPixels.displayListFingerprint === output.finalDisplayListFingerprint
    && browser.canvasPixels.pageCount === output.finalState.pageCount
  const mainThreadTiming = distribution(output.warmMainThreadDurationMs)
  const endToEndTiming = distribution(output.warmEndToEndDurationMs)
  const workerTiming = distribution(output.workerDurationMs)
  const frameBudgetP95Ms = Number(mainThreadTiming.p95Ms)
  const frameBudgetAccepted = Number.isFinite(frameBudgetP95Ms) && frameBudgetP95Ms <= 16.7
  if (
    !pageCreationAccepted
    || !pageRemovalAccepted
    || !incrementalReuseAccepted
    || !schedulingAccepted
    || !retentionAccepted
    || !rendererAccepted
    || !canvasAccepted
    || !frameBudgetAccepted
    || backendLikeRequests.length > 0
  ) throw new Error(`MR1 multi-block acceptance mismatch: ${JSON.stringify({
    pageCreationAccepted,
    pageRemovalAccepted,
    incrementalReuseAccepted,
    schedulingAccepted,
    retentionAccepted,
    rendererAccepted,
    canvasAccepted,
    frameBudgetAccepted,
    frameBudgetP95Ms,
    mainThreadTiming,
    compositionTiming: distribution(output.warmCompositionDurationMs),
    projectionTiming: distribution(output.warmProjectionDurationMs),
    paintTiming: distribution(output.warmPaintDurationMs),
    backendRequestCount: backendLikeRequests.length,
  })}`)

  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-mr1-multi-block-scheduling-v1",
    status: "accepted-bounded-multi-block-scheduling",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      realChromeWorkerWasm: true,
      initializedWorkerReused: true,
      textBlockCount: output.textBlockCount,
      activeAndVisibleFirst: true,
      coreFixedPointDocumentComposition: true,
      coreDocumentDisplayListProjection: true,
      realChromeAtomicCanvasPaint: true,
      backendRequestCount: backendLikeRequests.length,
      productBinding: false,
      productionBinding: false,
    },
    identity: {
      wasmSha256: output.diagnostics.wasmSha256,
      measurementProfileId: output.diagnostics.measurementProfileId,
      workerBoundaryVersion: output.diagnostics.boundaryVersion,
      fontSha256ById: output.diagnostics.fontSha256ById,
      finalDisplayListFingerprint: output.finalDisplayListFingerprint,
    },
    outcome: {
      initialPageCount: output.initial.pageCount,
      expandedPageCount: output.expanded.pageCount,
      contractedPageCount: output.contracted.pageCount,
      pageCreationAccepted,
      pageRemovalAccepted,
      incrementalReuseAccepted,
      sameGeometryWork: output.sameGeometryChange.work,
      sameGeometryProjectionWork: output.sameGeometryChange.projectionWork,
      initialRequestOrder: output.initialRequestOrder,
      requested: output.requested,
      paintedRevisions: output.paintedRevisions,
      paintedPageCounts: output.paintedPageCounts,
      staleCompletionRevision: 4,
      coalescedBeforeDispatchRevision: 5,
      finalMetrics: output.finalState.metrics,
      finalCanvasWidthPx: browser.canvasPixels.widthPx,
      finalCanvasHeightPx: browser.canvasPixels.heightPx,
      finalNonWhitePixelCount: browser.canvasPixels.nonWhitePixelCount,
      finalPngSha256: createHash("sha256").update(browser.canvasPixels.pngDataUrl).digest("hex"),
    },
    timing: {
      mainThreadFrameBudgetMs: 16.7,
      frameBudgetAccepted,
      warmMainThread: mainThreadTiming,
      warmEndToEnd: endToEndTiming,
      workerLayout: workerTiming,
      paint: distribution(output.paintDurationMs),
      assetFetchDurationMs: output.assetFetchDurationMs,
      fontReadinessDurationMs: output.fontReadinessDurationMs,
      initializationDurationMs: output.initializationDurationMs,
    },
    contracts: output.contracts,
    scope: {
      orderedTextBlocksOnly: true,
      textBlockCount: 12,
      activeBlockNearPageEnd: true,
      pageCreationAndRemoval: true,
      tokenAwareInvalidationHint: true,
      latestOnlyPriorityScheduling: true,
      exactBoundaryReconvergence: true,
      tables: false,
      columns: false,
      images: false,
      autoFitColumnWidth: false,
      productCanvasBinding: false,
      backendBinding: false,
      productionBinding: false,
    },
  }
  const outputPath = resolve(editorRoot, "src/fixtures/live-draft-mr1-multi-block-scheduling.v1.json")
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8")
  process.stdout.write(`${JSON.stringify({
    outputPath,
    status: evidence.status,
    outcome: evidence.outcome,
    timing: evidence.timing,
  }, null, 2)}\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
