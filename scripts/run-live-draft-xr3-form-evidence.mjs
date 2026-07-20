import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4181
const pageUrl = `http://127.0.0.1:${vitePort}/__qa/live-draft-xr3-form`

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

async function evaluateValue(cdp, expression) {
  const evaluated = await cdp.send("Runtime.evaluate", { expression, returnByValue: true })
  if (evaluated.exceptionDetails != null) {
    throw new Error(evaluated.exceptionDetails.exception?.description ?? "browser evaluation failed")
  }
  return evaluated.result?.value
}

async function readState(cdp) {
  return evaluateValue(cdp, `(() => {
    const output = document.querySelector('#flowdoc-live-draft-xr3-evidence-state');
    const surface = document.querySelector('.live-draft-form-result');
    if (output == null) return null;
    return {
      output: JSON.parse(output.textContent),
      surface: surface == null ? null : {
        phase: surface.dataset.phase,
        pendingRevision: surface.dataset.pendingRevision,
        appliedRevision: surface.dataset.appliedRevision,
        lineSource: surface.querySelector('.live-draft-form-lines')?.dataset.textSource ?? null,
      },
    };
  })()`)
}

async function waitFor(cdp, description, predicate, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await readState(cdp)
    if (state != null && predicate(state)) return state
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  throw new Error(`timed out waiting for ${description}`)
}

async function appendCharacter(cdp, character) {
  await evaluateValue(cdp, `(() => {
    const input = document.querySelector('#test-input-document-documentTitle');
    if (!(input instanceof HTMLInputElement)) throw new Error('documentTitle input is missing');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(input, input.value + ${JSON.stringify(character)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value.length;
  })()`)
}

async function typeBurst(cdp, text) {
  for (const character of text) {
    await appendCharacter(cdp, character)
    await new Promise((resolveWait) => setTimeout(resolveWait, 3))
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
    const requestUrls = []
    const cdp = await createCdpClient(webSocketUrl, (event) => {
      if (event.method === "Network.requestWillBeSent") requestUrls.push(event.params.request.url)
    })
    try {
      await cdp.send("Page.enable")
      await cdp.send("Runtime.enable")
      await cdp.send("Network.enable")
      const version = await cdp.send("Browser.getVersion")
      await cdp.send("Page.navigate", { url: pageUrl })
      const initial = await waitFor(cdp, "Form QA surface", (state) => state.surface != null)

      const firstText = "Prepared report"
      await typeBurst(cdp, firstText)
      const firstCurrent = await waitFor(cdp, "first current draft", (state) => (
        state.output.phase === "draft-current"
        && state.output.appliedRevision === firstText.length
      ))

      const firstAppliedRevision = firstCurrent.output.appliedRevision
      await appendCharacter(cdp, " ")
      const retainedDuringUpdate = await waitFor(cdp, "retained preview during update", (state) => (
        state.output.phase === "draft-updating"
        && state.output.appliedRevision === firstAppliedRevision
        && state.surface?.appliedRevision === String(firstAppliedRevision)
      ))
      const secondText = "updated"
      await typeBurst(cdp, secondText)
      const expectedLatestRevision = firstText.length + 1 + secondText.length
      const finalCurrent = await waitFor(cdp, "latest current draft", (state) => (
        state.output.phase === "draft-current"
        && state.output.appliedRevision === expectedLatestRevision
      ))

      const pageOrigin = new URL(pageUrl).origin
      const crossOriginRequests = requestUrls.filter((url) => new URL(url).origin !== pageOrigin)
      const backendLikeRequests = requestUrls.filter((url) => {
        const parsed = new URL(url)
        const path = parsed.pathname.toLowerCase()
        return path.startsWith("/api/")
          || path.startsWith("/preview/")
          || path.startsWith("/draft-preview/")
          || path.startsWith("/published-preview/")
          || path.startsWith("/pdf/")
          || path.startsWith("/render/")
          || path.startsWith("/export/")
      })
      const firstMetrics = firstCurrent.output.metrics
      const finalMetrics = finalCurrent.output.metrics
      const assertions = {
        rapidEditsCoalesced: firstMetrics.scheduledCount === firstText.length && firstMetrics.requestCount === 1,
        latestRevisionApplied: finalCurrent.output.appliedRevision === expectedLatestRevision,
        previousValidPreviewRetained: retainedDuringUpdate.surface?.lineSource === "core-accepted-lines",
        coreAcceptedLinesRendered: finalCurrent.surface?.lineSource === "core-accepted-lines",
        noBackendTransport: crossOriginRequests.length === 0 && backendLikeRequests.length === 0,
      }
      if (Object.values(assertions).some((value) => !value)) {
        throw new Error(`XR-3 browser assertion failed: ${JSON.stringify(assertions)}`)
      }
      return {
        browserVersion: version.product,
        initial: initial.output,
        firstCurrent: firstCurrent.output,
        retainedDuringUpdate: retainedDuringUpdate.output,
        finalCurrent: finalCurrent.output,
        expectedLatestRevision,
        firstEditCount: firstText.length,
        secondEditCount: secondText.length + 1,
        requestCount: requestUrls.length,
        crossOriginRequestCount: crossOriginRequests.length,
        backendLikeRequestCount: backendLikeRequests.length,
        assertions,
        metrics: {
          first: firstMetrics,
          final: finalMetrics,
        },
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
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-xr3-"))

try {
  await server.listen()
  const browser = await runBrowser(chromePath, profileRoot)
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-xr3-form-binding-v1",
    status: "observed-bounded-form-binding",
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
      realCoreLayoutBoundary: true,
      realFormStateAndCanonicalCandidate: true,
      debounceMs: 75,
      selectedScalarFieldOnly: true,
    },
    observations: {
      firstEditCount: browser.firstEditCount,
      secondEditCount: browser.secondEditCount,
      expectedLatestRevision: browser.expectedLatestRevision,
      initialPhase: browser.initial.phase,
      retainedPhase: browser.retainedDuringUpdate.phase,
      finalPhase: browser.finalCurrent.phase,
      finalAppliedRevision: browser.finalCurrent.appliedRevision,
      finalPageCount: browser.finalCurrent.pageCount,
      finalLineCount: browser.finalCurrent.lineCount,
      firstEndToEndDurationMs: browser.firstCurrent.endToEndDurationMs,
      finalEndToEndDurationMs: browser.finalCurrent.endToEndDurationMs,
      finalWorkerDurationMs: browser.finalCurrent.workerDurationMs,
      totalBrowserRequestCount: browser.requestCount,
      crossOriginRequestCount: browser.crossOriginRequestCount,
      backendLikeRequestCount: browser.backendLikeRequestCount,
      metrics: browser.metrics,
    },
    assertions: browser.assertions,
    interpretation: {
      performanceBudgetDefined: false,
      timingsAreObservational: true,
      staleResultRejectionCoveredDeterministicallyByControllerTest: true,
      requestPerKeystrokeAvoidedForObservedBurst: true,
    },
    scope: {
      qaRouteOnly: true,
      selectedFormScalarOnly: true,
      wholeDocumentIncrementalInvalidation: false,
      backendAdmission: false,
      publishedPreviewReplacement: false,
      exactPdfPreviewReplacement: false,
      productionPerformanceClaim: false,
    },
  }
  if (process.env.FLOWDOC_EVIDENCE_WRITE !== "0") {
    writeFileSync(
      resolve(editorRoot, "src/fixtures/live-draft-xr3-form-binding.v1.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    )
  }
  process.stdout.write(`${evidence.evidenceId}: bounded Form binding passed; no backend transport observed\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
