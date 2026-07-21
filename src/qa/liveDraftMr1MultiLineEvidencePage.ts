import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1"
import { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 } from "@flowdoc/text-engine-rust-wasm"
import { projectCoreLiveDraftMultiRunDisplayListV1 } from "../core/coreAdapter"
import { ensureFlowDocLiveDraftMr1CanvasFontsV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasFont"
import { paintFlowDocLiveDraftMultiRunCanvasV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasPainter"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"
import {
  createFlowDocLiveDraftMr1MultiLineLayoutInputV1,
  FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN,
  FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE,
  FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PROJECTION_ID,
} from "./liveDraftMr1MultiLineFixture"
import type {
  FlowDocLiveDraftMr1WorkerRequestV1,
  FlowDocLiveDraftMr1WorkerResponseV1,
} from "./liveDraftMr1Evidence.worker"

const WARM_SAMPLE_COUNT = 25

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-multiline-result")
  if (target == null) throw new Error("MR1 multiline result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

function paintFacts(value: ReturnType<typeof paintFlowDocLiveDraftMultiRunCanvasV1>) {
  const { paintDurationMs: _paintDurationMs, ...facts } = value
  return facts
}

async function run(): Promise<void> {
  const assetStartedAt = performance.now()
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_MR1_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned MR1 multiline WASM/font bytes")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const fontStartedAt = performance.now()
  const fontReadiness = await ensureFlowDocLiveDraftMr1CanvasFontsV1({
    regularBytes: regularBytes.slice(0),
    boldBytes: boldBytes.slice(0),
  })
  const fontReadinessDurationMs = performance.now() - fontStartedAt

  const layoutInput = createFlowDocLiveDraftMr1MultiLineLayoutInputV1()
  const [regularFace, boldFace] = layoutInput.fontFaces
  if (regularFace == null || boldFace == null) throw new Error("MR1 multiline font fixture is incomplete")
  const { fontFaces: _fontFaces, ...workerLayout } = layoutInput
  const worker = new Worker(
    new URL("./liveDraftMr1Evidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-multiline-evidence" },
  )
  const response = new Promise<FlowDocLiveDraftMr1WorkerResponseV1>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<FlowDocLiveDraftMr1WorkerResponseV1>) => resolve(event.data)
    worker.onerror = (event) => reject(new Error(event.message))
  })
  const request: FlowDocLiveDraftMr1WorkerRequestV1 = {
    type: "live-draft-mr1.run",
    measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
    wasmBytes,
    fonts: [{ face: regularFace, bytes: regularBytes }, { face: boldFace, bytes: boldBytes }],
    layout: workerLayout,
    warmSampleCount: WARM_SAMPLE_COUNT,
  }
  const workerStartedAt = performance.now()
  worker.postMessage(request, [wasmBytes, regularBytes, boldBytes])
  const workerResponse = await response
  const workerRoundTripMs = performance.now() - workerStartedAt
  worker.terminate()
  if (workerResponse.type !== "live-draft-mr1.result") throw new Error(workerResponse.message)
  if (workerResponse.result.status !== "accepted") {
    throw new Error(workerResponse.result.issues.map((item) => item.message).join("\n"))
  }
  const acceptedResult = workerResponse.result

  const projectionStartedAt = performance.now()
  const displayList = projectCoreLiveDraftMultiRunDisplayListV1({
    projectionId: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PROJECTION_ID,
    layout: acceptedResult.layout,
    origin: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN,
  })
  const projectionDurationMs = performance.now() - projectionStartedAt
  const warmProjectionDurationMs: number[] = []
  const warmProjectionResults = Array.from({ length: WARM_SAMPLE_COUNT }, () => {
    const startedAt = performance.now()
    const projected = projectCoreLiveDraftMultiRunDisplayListV1({
      projectionId: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PROJECTION_ID,
      layout: acceptedResult.layout,
      origin: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN,
    })
    warmProjectionDurationMs.push(performance.now() - startedAt)
    return projected
  })
  const serializedDisplayList = JSON.stringify(displayList)
  const projectionSamplesConsistent = warmProjectionResults.every(
    (candidate) => JSON.stringify(candidate) === serializedDisplayList,
  )

  const canvas = document.querySelector<HTMLCanvasElement>("#flowdoc-live-draft-mr1-multiline-canvas")
  if (canvas == null) throw new Error("MR1 multiline Canvas target is missing")
  const paint = paintFlowDocLiveDraftMultiRunCanvasV1({
    canvas,
    displayList,
    page: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE,
  })
  const warmPaintDurationMs: number[] = []
  const warmPaintResults = Array.from({ length: WARM_SAMPLE_COUNT }, () => {
    const painted = paintFlowDocLiveDraftMultiRunCanvasV1({
      canvas,
      displayList,
      page: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE,
    })
    warmPaintDurationMs.push(painted.paintDurationMs)
    return painted
  })
  const serializedPaintFacts = JSON.stringify(paintFacts(paint))
  const paintSamplesConsistent = warmPaintResults.every(
    (candidate) => JSON.stringify(paintFacts(candidate)) === serializedPaintFacts,
  )
  canvas.dataset.paintStatus = "painted"
  canvas.dataset.displayListFingerprint = displayList.fingerprint

  writeResult("pass", {
    assetFetchDurationMs,
    fontReadinessDurationMs,
    workerRoundTripMs,
    workerDurationMs: workerResponse.durationMs,
    initializationDurationMs: workerResponse.initializationDurationMs,
    coldLayoutDurationMs: workerResponse.coldLayoutDurationMs,
    warmLayoutDurationMs: workerResponse.warmLayoutDurationMs,
    workerSamplesConsistent: workerResponse.samplesConsistent,
    identity: workerResponse.identity,
    result: workerResponse.result,
    displayList,
    projectionDurationMs,
    warmProjectionDurationMs,
    projectionSamplesConsistent,
    fontReadiness,
    paint,
    warmPaintDurationMs,
    paintSamplesConsistent,
  })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
