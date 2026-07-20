import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets"
import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1,
} from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import {
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  type FlowDocLiveDraftWorkerResponseV1,
} from "../editor/liveDraft/liveDraftWorkerProtocol"

interface BrowserWorkerSmokeOutputV1 {
  runtimeIdentity: Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.diagnostics" }>["engineIdentity"]
  initializationDurationMs: number
  rows: Array<{
    rowId: string
    fixtureId: string
    scenarioId: string
    durationMs: number
    result: Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.result" }>["measurement"]
  }>
}

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-worker-smoke-result")
  if (target == null) throw new Error("smoke result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

async function run(): Promise<void> {
  const [wasmResponse, fontResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL),
  ])
  if (!wasmResponse.ok || !fontResponse.ok) throw new Error("failed to load pinned WASM or font bytes")
  const [wasmBytes, fontBytes] = await Promise.all([wasmResponse.arrayBuffer(), fontResponse.arrayBuffer()])
  const worker = new Worker(
    new URL("../editor/liveDraft/liveDraftEngine.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-xr1-smoke" },
  )
  const output: Partial<BrowserWorkerSmokeOutputV1> = { rows: [] }
  let nextRowIndex = 0

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("browser worker smoke timed out")), 120_000)
    worker.onerror = (event) => reject(new Error(event.message))
    worker.onmessage = (event: MessageEvent<FlowDocLiveDraftWorkerResponseV1>) => {
      const response = event.data
      if (response.type === "live-draft.blocked") {
        reject(new Error(response.message))
        return
      }
      if (response.type === "live-draft.diagnostics") {
        output.runtimeIdentity = response.engineIdentity
        output.initializationDurationMs = response.durationMs
      } else if (response.type === "live-draft.result") {
        output.rows!.push({
          rowId: response.smokeRow.rowId,
          fixtureId: response.smokeRow.fixtureId,
          scenarioId: response.smokeRow.scenarioId,
          durationMs: response.durationMs,
          result: response.measurement,
        })
        nextRowIndex += 1
      } else {
        reject(new Error(`unexpected Worker response: ${response.type}`))
        return
      }
      const row = FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[nextRowIndex]
      if (row == null) {
        window.clearTimeout(timeout)
        resolve()
        return
      }
      worker.postMessage({
        protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
        type: "live-draft.layout",
        identity: {
          documentId: "live-draft-xr1-smoke-document",
          structureRevision: 1,
          draftSnapshotFingerprint: `qa:draft:${row.rowId}`,
          canonicalFormCandidateFingerprint: `qa:form:${row.rowId}`,
          assetRegistryFingerprint: "qa:asset-registry:sarabun-regular",
          measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
          fontManifestFingerprint: "qa:font-manifest:sarabun-regular",
          wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
          layoutPipelineVersion: "live-draft-xr1-smoke-v1",
          requestId: `qa:${row.rowId}`,
          requestRevision: nextRowIndex + 1,
        },
        smokeRow: row,
      })
    }
    worker.postMessage({
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.initialize",
      measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
      wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
      wasmBytes,
      fonts: [{
        fontId: "sarabun-regular",
        sha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[0].fontSha256,
        bytes: fontBytes,
      }],
    }, [wasmBytes, fontBytes])
  })
  worker.terminate()
  writeResult("pass", output as BrowserWorkerSmokeOutputV1)
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
