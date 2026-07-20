import { createHash } from "node:crypto"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4182
const pageUrl = `http://127.0.0.1:${vitePort}/__qa/live-draft-xr4-canvas`
const server = await createServer({
  root: editorRoot,
  appType: "spa",
  logLevel: "error",
  server: { host: "127.0.0.1", port: vitePort, strictPort: true, fs: { allow: [editorRoot, coreRoot] } },
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
        const target = (await response.json()).find((candidate) => candidate.type === "page")
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

async function evaluate(cdp, expression) {
  const evaluated = await cdp.send("Runtime.evaluate", { expression, returnByValue: true })
  if (evaluated.exceptionDetails != null) {
    throw new Error(evaluated.exceptionDetails.exception?.description ?? "browser evaluation failed")
  }
  return evaluated.result?.value
}

async function readState(cdp) {
  return evaluate(cdp, `(() => {
    const output = document.querySelector('#flowdoc-live-draft-xr4-evidence-state');
    const surface = document.querySelector('.live-draft-form-result');
    if (output == null || surface == null) return null;
    const canvases = [...surface.querySelectorAll('.live-draft-canvas-page')];
    return {
      output: JSON.parse(output.textContent),
      surface: {
        phase: surface.dataset.phase,
        pendingRevision: surface.dataset.pendingRevision,
        appliedRevision: surface.dataset.appliedRevision,
        paintSource: surface.querySelector('.live-draft-canvas-page-stack')?.dataset.paintSource ?? null,
      },
      canvases: canvases.map((canvas) => ({
        pageIndex: Number(canvas.dataset.pageIndex),
        paintStatus: canvas.dataset.paintStatus ?? null,
        paintDurationMs: Number(canvas.dataset.paintDurationMs ?? '0'),
        commandCount: Number(canvas.dataset.commandCount ?? '0'),
        nonBlankCommandCount: Number(canvas.dataset.nonBlankCommandCount ?? '0'),
        fingerprint: canvas.dataset.displayListFingerprint ?? null,
        widthPx: canvas.width,
        heightPx: canvas.height,
        clientWidth: canvas.getBoundingClientRect().width,
        clientHeight: canvas.getBoundingClientRect().height,
      })),
      viewport: {
        innerWidth: window.innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        stackClientWidth: surface.querySelector('.live-draft-canvas-page-stack')?.clientWidth ?? null,
        stackScrollWidth: surface.querySelector('.live-draft-canvas-page-stack')?.scrollWidth ?? null,
      },
    };
  })()`)
}

async function waitFor(cdp, description, predicate, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await readState(cdp)
    if (state?.output.phase === "draft-blocked") {
      throw new Error(`blocked while waiting for ${description}: ${state.output.message}`)
    }
    if (state != null && predicate(state)) return state
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  throw new Error(`timed out waiting for ${description}`)
}

async function setInputValue(cdp, value) {
  await evaluate(cdp, `(() => {
    const input = document.querySelector('#test-input-document-documentTitle');
    if (!(input instanceof HTMLInputElement)) throw new Error('documentTitle input is missing');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value.length;
  })()`)
}

async function appendCharacter(cdp, character) {
  const current = await evaluate(cdp, "document.querySelector('#test-input-document-documentTitle')?.value ?? ''")
  await setInputValue(cdp, current + character)
}

async function typeBurst(cdp, text) {
  for (const character of text) {
    await appendCharacter(cdp, character)
    await new Promise((resolveWait) => setTimeout(resolveWait, 3))
  }
}

async function canvasPixels(cdp) {
  return evaluate(cdp, `(() => {
    const canvas = document.querySelector('.live-draft-canvas-page');
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('painted Canvas is missing');
    const context = canvas.getContext('2d');
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonWhitePixelCount = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] < 248 || pixels[index + 1] < 248 || pixels[index + 2] < 248) nonWhitePixelCount += 1;
    }
    return { nonWhitePixelCount, pngDataUrl: canvas.toDataURL('image/png') };
  })()`)
}

function canvasSummary(state) {
  return {
    pageCount: state.canvases.length,
    totalCommandCount: state.canvases.reduce((sum, canvas) => sum + canvas.commandCount, 0),
    totalNonBlankCommandCount: state.canvases.reduce((sum, canvas) => sum + canvas.nonBlankCommandCount, 0),
    totalPaintDurationMs: state.canvases.reduce((sum, canvas) => sum + canvas.paintDurationMs, 0),
    intrinsicPageSizes: state.canvases.map((canvas) => [canvas.widthPx, canvas.heightPx]),
    cssPageSizes: state.canvases.map((canvas) => [canvas.clientWidth, canvas.clientHeight]),
  }
}

async function runBrowser(chromePath, profileRoot) {
  const debuggingPort = await reservePort()
  const chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--user-data-dir=${profileRoot}`, `--remote-debugging-port=${debuggingPort}`, "about:blank",
  ], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] })
  let chromeError = ""
  chrome.stderr.setEncoding("utf8")
  chrome.stderr.on("data", (chunk) => { chromeError += chunk })
  try {
    const webSocketUrl = await waitForChromeTarget(debuggingPort)
    const requestUrls = []
    const cdp = await createCdpClient(webSocketUrl, (event) => {
      if (event.method === "Network.requestWillBeSent") requestUrls.push(event.params.request.url)
    })
    try {
      await cdp.send("Page.enable")
      await cdp.send("Runtime.enable")
      await cdp.send("Network.enable")
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
      })
      const version = await cdp.send("Browser.getVersion")
      await cdp.send("Page.navigate", { url: pageUrl })
      await waitFor(cdp, "Canvas QA surface", (state) => state.surface != null)

      const firstText = "Prepared report"
      await typeBurst(cdp, firstText)
      const firstPainted = await waitFor(cdp, "first painted Canvas", (state) => (
        state.output.phase === "draft-current"
        && state.output.appliedRevision === firstText.length
        && state.canvases.length === state.output.displayListPageCount
        && state.canvases.every((canvas) => canvas.paintStatus === "painted")
      ))
      const firstFingerprint = firstPainted.output.displayListFingerprint
      const firstPixels = await canvasPixels(cdp)

      await appendCharacter(cdp, " ")
      const retainedDuringUpdate = await waitFor(cdp, "retained painted Canvas", (state) => (
        state.output.phase === "draft-updating"
        && state.output.displayListFingerprint === firstFingerprint
        && state.canvases.every((canvas) => canvas.paintStatus === "painted" && canvas.fingerprint === firstFingerprint)
      ))
      await typeBurst(cdp, "updated")
      const secondPainted = await waitFor(cdp, "second painted Canvas", (state) => (
        state.output.phase === "draft-current"
        && state.output.appliedRevision === firstText.length + 8
        && state.canvases.every((canvas) => canvas.paintStatus === "painted")
      ))

      const longText = Array.from({ length: 44 }, (_, index) => `หัวข้อ${index + 1} Prepared summary`).join(" ")
      await setInputValue(cdp, longText)
      const multiPage = await waitFor(cdp, "multi-page painted Canvas", (state) => (
        state.output.phase === "draft-current"
        && state.output.displayListPageCount >= 2
        && state.canvases.length === state.output.displayListPageCount
        && state.canvases.every((canvas) => canvas.paintStatus === "painted")
      ))
      const desktopState = await readState(cdp)
      if (desktopState == null) throw new Error("desktop Canvas state is unavailable")
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
      })
      const mobile = await waitFor(cdp, "responsive mobile Canvas", (state) => (
        state.viewport.innerWidth === 390 && state.canvases.every((canvas) => canvas.clientWidth <= 390)
      ))

      const pageOrigin = new URL(pageUrl).origin
      const crossOriginRequests = requestUrls.filter((url) => new URL(url).origin !== pageOrigin)
      const backendLikeRequests = requestUrls.filter((url) => {
        const path = new URL(url).pathname.toLowerCase()
        return path.startsWith("/api/") || path.startsWith("/preview/") || path.startsWith("/draft-preview/")
          || path.startsWith("/published-preview/") || path.startsWith("/pdf/")
          || path.startsWith("/render/") || path.startsWith("/export/")
      })
      const mobileRatioStable = mobile.canvases.every((canvas) => (
        Math.abs((canvas.clientHeight / canvas.clientWidth) - (841.89 / 595.28)) < 0.01
      ))
      const intrinsicStable = JSON.stringify(mobile.canvases.map((canvas) => [canvas.widthPx, canvas.heightPx]))
        === JSON.stringify(multiPage.canvases.map((canvas) => [canvas.widthPx, canvas.heightPx]))
      const assertions = {
        coreDisplayListConsumed: multiPage.surface.paintSource === "core-text-flow-display-list",
        browserMeasurementForbidden: multiPage.output.rendererMayMeasureText === false,
        browserRelayoutForbidden: multiPage.output.rendererMayRelayout === false,
        nonBlankPixelsPainted: firstPixels.nonWhitePixelCount > 100,
        pageAndCommandCountsMatch: multiPage.canvases.length === multiPage.output.displayListPageCount
          && multiPage.canvases.reduce((sum, canvas) => sum + canvas.commandCount, 0) === multiPage.output.displayListCommandCount,
        previousCanvasRetained: retainedDuringUpdate.output.displayListFingerprint === firstFingerprint,
        intrinsicGeometryStable: intrinsicStable,
        responsiveAspectStable: mobileRatioStable,
        noHorizontalOverflow: mobile.viewport.documentScrollWidth <= mobile.viewport.innerWidth
          && (mobile.viewport.stackScrollWidth ?? 0) <= (mobile.viewport.stackClientWidth ?? 0) + 1,
        noBackendTransport: crossOriginRequests.length === 0 && backendLikeRequests.length === 0,
      }
      if (Object.values(assertions).some((value) => !value)) {
        throw new Error(`XR-4 browser assertion failed: ${JSON.stringify(assertions)}`)
      }
      return {
        browserVersion: version.product,
        first: firstPainted.output,
        second: secondPainted.output,
        multiPage: multiPage.output,
        retained: retainedDuringUpdate.output,
        firstCanvas: canvasSummary(firstPainted),
        multiPageCanvas: canvasSummary(multiPage),
        desktopViewport: desktopState.viewport,
        mobileViewport: mobile.viewport,
        mobileCanvas: canvasSummary(mobile),
        firstNonWhitePixelCount: firstPixels.nonWhitePixelCount,
        firstCanvasPngSha256: createHash("sha256")
          .update(Buffer.from(firstPixels.pngDataUrl.split(",")[1], "base64"))
          .digest("hex"),
        totalBrowserRequestCount: requestUrls.length,
        crossOriginRequestCount: crossOriginRequests.length,
        backendLikeRequestCount: backendLikeRequests.length,
        assertions,
      }
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

const chromePath = process.env.FLOWDOC_CHROME_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-xr4-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-xr4-canvas-page-renderer-v1",
    status: "observed-bounded-canvas-renderer",
    generatedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      browser: browser.browserVersion,
    },
    execution: {
      realBrowser: true,
      realWorker: true,
      realCoreDisplayListProjection: true,
      realCanvas2d: true,
      pinnedCanvasFontAsset: true,
      selectedScalarFieldOnly: true,
    },
    observations: {
      first: browser.first,
      second: browser.second,
      multiPage: browser.multiPage,
      retained: browser.retained,
      firstCanvas: browser.firstCanvas,
      multiPageCanvas: browser.multiPageCanvas,
      mobileCanvas: browser.mobileCanvas,
      desktopViewport: browser.desktopViewport,
      mobileViewport: browser.mobileViewport,
      firstNonWhitePixelCount: browser.firstNonWhitePixelCount,
      firstCanvasPngSha256: browser.firstCanvasPngSha256,
      totalBrowserRequestCount: browser.totalBrowserRequestCount,
      crossOriginRequestCount: browser.crossOriginRequestCount,
      backendLikeRequestCount: browser.backendLikeRequestCount,
    },
    assertions: browser.assertions,
    interpretation: {
      performanceBudgetDefined: false,
      timingsAreObservational: true,
      lineBreakAndBoundsComeFromCore: true,
      canvasGlyphRasterizationRemainsRendererOwned: true,
      crossRuntimeGlyphPixelParityClaimed: false,
    },
    scope: {
      qaRouteOnly: true,
      selectedFormScalarOnly: true,
      wholeDocumentRenderer: false,
      imagesTablesAndStyledRuns: false,
      backendAdmission: false,
      publishedPreviewReplacement: false,
      productionPerformanceClaim: false,
    },
  }
  if (process.env.FLOWDOC_EVIDENCE_WRITE !== "0") {
    writeFileSync(
      resolve(editorRoot, "src/fixtures/live-draft-xr4-canvas-page-renderer.v1.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    )
  }
  process.stdout.write(`${evidence.evidenceId}: Core display list painted to responsive nonblank Canvas pages\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
