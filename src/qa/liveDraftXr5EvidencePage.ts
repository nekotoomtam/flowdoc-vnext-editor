import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_BOLD_URL } from "@flowdoc/text-engine-rust-wasm/browser-assets-xr5"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import {
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  type FlowDocLiveDraftWorkerResponseV1,
} from "../editor/liveDraft/liveDraftWorkerProtocol"
import {
  FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1,
  FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT,
  type FlowDocLiveDraftXr5MatrixRowV1,
} from "./liveDraftXr5Matrix"

interface BrowserSampleV1 {
  roundTripMs: number
  workerDurationMs: number
  cacheStatus: "hit" | "miss" | "uncached"
  timings: NonNullable<Extract<FlowDocLiveDraftWorkerResponseV1, { type: "live-draft.result" }>["coreLayout"]>["timings"]
}

interface BrowserXr5OutputV1 {
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
    cold: BrowserSampleV1
    warm: BrowserSampleV1
    samplesConsistent: boolean
  }>
}

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-xr5-result")
  if (target == null) throw new Error("XR5 result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

async function run(): Promise<void> {
  const assetStartedAt = performance.now()
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned XR5 WASM/font bytes")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const worker = new Worker(
    new URL("../editor/liveDraft/liveDraftEngine.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-xr5-evidence" },
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
      sha256: FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1.find((row) => row.fontId === "sarabun-regular")!.fontSha256,
      bytes: regularBytes,
    }, {
      fontId: "sarabun-bold",
      sha256: FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1.find((row) => row.fontId === "sarabun-bold")!.fontSha256,
      bytes: boldBytes,
    }],
  }, [wasmBytes, regularBytes, boldBytes])
  const diagnostics = await initialized
  if (diagnostics.type !== "live-draft.diagnostics") throw new Error("XR5 worker did not initialize")
  const initializationRoundTripMs = performance.now() - initializationStartedAt

  let revision = 0
  const measure = async (row: FlowDocLiveDraftXr5MatrixRowV1, cacheAction: "retain" | "clear-before") => {
    revision += 1
    const responsePromise = nextResponse()
    const startedAt = performance.now()
    worker.postMessage({
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.layout",
      identity: {
        documentId: "live-draft-xr5-matrix-document",
        structureRevision: 1,
        draftSnapshotFingerprint: `qa:xr5:draft:${row.rowId}`,
        canonicalFormCandidateFingerprint: `qa:xr5:form:${row.rowId}`,
        assetRegistryFingerprint: "qa:xr5:asset-registry:sarabun-regular-bold",
        measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
        fontManifestFingerprint: "qa:xr5:font-manifest:sarabun-regular-bold",
        wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
        layoutPipelineVersion: "live-draft-xr5-cross-runtime-matrix-v1",
        requestId: `qa:xr5:${row.rowId}:${revision}`,
        requestRevision: revision,
      },
      smokeRow: {
        rowId: row.rowId,
        fixtureId: row.fixtureId,
        scenarioId: row.scenarioId,
        textBlockId: `live-draft-xr5:${row.rowId}`,
        text: row.text,
        fontId: row.fontId,
        fontSha256: row.fontSha256,
      },
      coreLayout: {
        availableWidthPt: row.availableWidthPt,
        fontSizePt: row.fontSizePt,
        lineHeightPt: row.lineHeightPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
        styleKey: row.styleKey,
        cacheAction,
        ...(row.sourceRuns == null ? {} : { sourceRuns: row.sourceRuns }),
        displayList: row.displayList,
      },
    })
    const response = await responsePromise
    const roundTripMs = performance.now() - startedAt
    if (response.type !== "live-draft.result" || response.coreLayout == null || response.coreLayout.displayList == null) {
      throw new Error("XR5 worker did not return a Core display-list result")
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

  const rows: BrowserXr5OutputV1["rows"] = []
  for (const row of FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1) {
    const cold = await measure(row, "clear-before")
    const warm = await measure(row, "retain")
    const correctness = (value: typeof cold.coreLayout): string => {
      const { timings: _timings, measurement, ...layout } = value
      const { cacheStatus: _cacheStatus, ...measurementFacts } = measurement
      return JSON.stringify({ ...layout, measurement: measurementFacts })
    }
    rows.push({
      rowId: row.rowId,
      reference: { measurement: cold.measurement, coreLayout: cold.coreLayout },
      cold: cold.sample,
      warm: warm.sample,
      samplesConsistent: correctness(cold.coreLayout) === correctness(warm.coreLayout)
        && JSON.stringify(cold.measurement) === JSON.stringify(warm.measurement),
    })
  }
  worker.terminate()
  writeResult("pass", {
    assetFetchDurationMs,
    initializationRoundTripMs,
    initializationDurationMs: diagnostics.durationMs,
    runtimeIdentity: diagnostics.engineIdentity,
    rows,
    samples: FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT,
  } satisfies BrowserXr5OutputV1 & { samples: typeof FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
