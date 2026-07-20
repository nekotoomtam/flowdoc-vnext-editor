import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import {
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  type FlowDocLiveDraftWorkerResponseV1,
} from "../editor/liveDraft/liveDraftWorkerProtocol"
import {
  FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT,
  FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT,
  FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1,
  type FlowDocLiveDraftXr2WorkloadV1,
} from "./liveDraftXr2Workloads"

interface BrowserSampleV1 {
  roundTripMs: number
  workerDurationMs: number
  cacheStatus: "hit" | "miss" | "uncached"
  timings: NonNullable<Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.result" }>["coreLayout"]>["timings"]
}

interface BrowserXr2OutputV1 {
  assetFetchDurationMs: number
  initializationRoundTripMs: number
  initializationDurationMs: number
  runtimeIdentity: Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.diagnostics" }>["engineIdentity"]
  rows: Array<{
    rowId: string
    reference: {
      measurement: Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.result" }>["measurement"]
      coreLayout: NonNullable<Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.result" }>["coreLayout"]>
    }
    cold: BrowserSampleV1[]
    warm: BrowserSampleV1[]
    allSamplesConsistent: boolean
  }>
}

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-xr2-result")
  if (target == null) throw new Error("XR-2 result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

async function run(): Promise<void> {
  const assetStartedAt = performance.now()
  const [wasmResponse, fontResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL),
  ])
  if (!wasmResponse.ok || !fontResponse.ok) throw new Error("failed to load pinned WASM or font bytes")
  const [wasmBytes, fontBytes] = await Promise.all([wasmResponse.arrayBuffer(), fontResponse.arrayBuffer()])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const worker = new Worker(
    new URL("../editor/liveDraft/liveDraftEngine.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-xr2-evidence" },
  )
  let pending: ((response: FlowDocLiveDraftWorkerResponseV1) => void) | null = null
  let rejectPending: ((error: Error) => void) | null = null
  worker.onerror = (event) => rejectPending?.(new Error(event.message))
  worker.onmessage = (event: MessageEvent<FlowDocLiveDraftWorkerResponseV1>) => {
    if (event.data.type === "live-draft.blocked") {
      rejectPending?.(new Error(event.data.message))
      return
    }
    pending?.(event.data)
  }
  const nextResponse = (): Promise<FlowDocLiveDraftWorkerResponseV1> => new Promise((resolve, reject) => {
    pending = resolve
    rejectPending = reject
  })

  const initializationStartedAt = performance.now()
  const initialized = nextResponse()
  worker.postMessage({
    protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
    type: "live-draft.initialize",
    measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
    wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
    wasmBytes,
    fonts: [{
      fontId: "sarabun-regular",
      sha256: FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1[0].fontSha256,
      bytes: fontBytes,
    }],
  }, [wasmBytes, fontBytes])
  const diagnostics = await initialized
  if (diagnostics.type !== "live-draft.diagnostics") throw new Error("worker did not initialize")
  const initializationRoundTripMs = performance.now() - initializationStartedAt

  let revision = 0
  const measure = async (
    row: FlowDocLiveDraftXr2WorkloadV1,
    cacheAction: "retain" | "clear-before",
  ) => {
    revision += 1
    const responsePromise = nextResponse()
    const startedAt = performance.now()
    worker.postMessage({
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.layout",
      identity: {
        documentId: "live-draft-xr2-evidence-document",
        structureRevision: 1,
        draftSnapshotFingerprint: `qa:draft:${row.rowId}`,
        canonicalFormCandidateFingerprint: `qa:form:${row.rowId}`,
        assetRegistryFingerprint: "qa:asset-registry:sarabun-regular",
        measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
        fontManifestFingerprint: "qa:font-manifest:sarabun-regular",
        wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
        layoutPipelineVersion: "live-draft-xr2-one-block-v1",
        requestId: `qa:xr2:${row.rowId}:${revision}`,
        requestRevision: revision,
      },
      smokeRow: row,
      coreLayout: {
        availableWidthPt: row.availableWidthPt,
        fontSizePt: row.fontSizePt,
        lineHeightPt: row.lineHeightPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
        styleKey: row.styleKey,
        cacheAction,
      },
    })
    const response = await responsePromise
    const roundTripMs = performance.now() - startedAt
    if (response.type !== "live-draft.result" || response.coreLayout == null) {
      throw new Error("worker did not return a Core layout result")
    }
    return {
      sample: {
        roundTripMs,
        workerDurationMs: response.durationMs,
        cacheStatus: response.coreLayout.measurement.cacheStatus,
        timings: response.coreLayout.timings,
      } satisfies BrowserSampleV1,
      measurement: response.measurement,
      coreLayout: response.coreLayout,
    }
  }

  const rows: BrowserXr2OutputV1["rows"] = []
  for (const row of FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1) {
    const cold: BrowserSampleV1[] = []
    const warm: BrowserSampleV1[] = []
    let reference: BrowserXr2OutputV1["rows"][number]["reference"] | null = null
    let referenceCorrectness = ""
    let allSamplesConsistent = true
    const retain = (result: Awaited<ReturnType<typeof measure>>, target: BrowserSampleV1[]): void => {
      const { timings: _timings, measurement, ...layout } = result.coreLayout
      const { cacheStatus: _cacheStatus, ...measurementCorrectness } = measurement
      const currentCorrectness = JSON.stringify({ ...layout, measurement: measurementCorrectness })
      if (reference == null) {
        reference = { measurement: result.measurement, coreLayout: result.coreLayout }
        referenceCorrectness = currentCorrectness
      } else if (currentCorrectness !== referenceCorrectness) {
        allSamplesConsistent = false
      }
      target.push(result.sample)
    }
    for (let index = 0; index < FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT; index += 1) {
      retain(await measure(row, "clear-before"), cold)
    }
    for (let index = 0; index < FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT; index += 1) {
      retain(await measure(row, "retain"), warm)
    }
    if (reference == null) throw new Error(`XR-2 row produced no samples: ${row.rowId}`)
    rows.push({ rowId: row.rowId, reference, cold, warm, allSamplesConsistent })
  }
  worker.terminate()
  writeResult("pass", {
    assetFetchDurationMs,
    initializationRoundTripMs,
    initializationDurationMs: diagnostics.durationMs,
    runtimeIdentity: diagnostics.engineIdentity,
    rows,
  } satisfies BrowserXr2OutputV1)
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
