import { spawn } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { createServer } from "vite"

const editorRoot = resolve(import.meta.dirname, "..")
const coreRoot = resolve(editorRoot, "../flowdoc-vnext-core")
const vitePort = 4179
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

async function runBrowserWorkerSmoke(chromePath, profileRoot) {
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
      await cdp.send("Page.navigate", {
        url: `http://127.0.0.1:${vitePort}/qa/live-draft-xr1-worker-smoke.html`,
      })
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        const evaluated = await cdp.send("Runtime.evaluate", {
          expression: `(() => { const target = document.querySelector('#flowdoc-live-draft-worker-smoke-result'); return target == null ? null : { status: target.dataset.status, text: target.textContent }; })()`,
          returnByValue: true,
        })
        const value = evaluated.result?.value
        if (value?.status === "pass") return JSON.parse(value.text)
        if (value?.status === "fail") {
          const failure = JSON.parse(value.text)
          throw new Error(`browser worker smoke blocked: ${failure.message ?? "unknown"}`)
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 100))
      }
      throw new Error("browser worker smoke timed out")
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
const profileRoot = mkdtempSync(resolve(tmpdir(), "flowdoc-live-draft-xr1-"))

try {
  await server.listen()
  const browserOutput = await runBrowserWorkerSmoke(chromePath, profileRoot)
  const runtime = await server.ssrLoadModule("/scripts/run-live-draft-worker-smoke-runtime.ts")
  const nodeRows = runtime.runNodeSmokeRows()
  if (nodeRows.length !== browserOutput.rows.length) throw new Error("Node/Worker row count mismatch")
  const rows = nodeRows.map((nodeRow, index) => {
    const workerRow = browserOutput.rows[index]
    const matches = nodeRow.rowId === workerRow.rowId
      && JSON.stringify(nodeRow.result) === JSON.stringify(workerRow.result)
    if (!matches) throw new Error(`Node/Worker normalized result mismatch: ${nodeRow.rowId}`)
    return {
      rowId: nodeRow.rowId,
      fixtureId: nodeRow.fixtureId,
      scenarioId: nodeRow.scenarioId,
      status: "matched",
      nodeRuntimeIdentity: nodeRow.identity,
      workerDurationMs: workerRow.durationMs,
      normalizedResult: workerRow.result,
    }
  })
  const evidence = {
    evidenceVersion: 1,
    evidenceId: "live-draft-xr1-browser-worker-smoke-v1",
    status: "accepted-two-row-runtime-smoke",
    generatedAt: new Date().toISOString(),
    execution: {
      realBrowserWorker: true,
      browser: "headless-chrome",
      nodeNativeRustybuzz: true,
      nodeNativeIcu4x: true,
      workerWasmRustybuzz: true,
      workerWasmIcu4x: true,
    },
    identity: runtime.FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
    workerRuntimeIdentity: browserOutput.runtimeIdentity,
    initializationDurationMs: browserOutput.initializationDurationMs,
    rows,
    scope: {
      acceptedRowsOnly: true,
      crossRuntimeExactnessClaim: false,
      productionBinding: false,
      defaultMeasurerReplacement: false,
      formBinding: false,
      backendRequestPerKeystroke: false,
    },
  }
  if (process.env.FLOWDOC_EVIDENCE_WRITE !== "0") {
    writeFileSync(
      resolve(editorRoot, "src/fixtures/live-draft-xr1-browser-worker-smoke.v1.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    )
  }
  process.stdout.write(`${evidence.evidenceId}: ${rows.length} rows matched\n`)
} finally {
  await server.close()
  rmSync(profileRoot, { recursive: true, force: true })
}
