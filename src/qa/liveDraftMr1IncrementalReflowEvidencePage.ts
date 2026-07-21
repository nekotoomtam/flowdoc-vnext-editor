import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1"
import { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 } from "@flowdoc/text-engine-rust-wasm"
import { analyzeFlowDocLiveDraftTextBlockTokenImpactV1 } from
  "../editor/liveDraft/liveDraftMultiBlockImpact"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"
import {
  createFlowDocLiveDraftMr1LongBlockInputV1,
  replaceFlowDocLiveDraftMr1LongBlockTextV1,
} from "./liveDraftMr1IncrementalReflowFixture"
import type {
  FlowDocLiveDraftMr1IncrementalReflowWorkerRequestV1,
  FlowDocLiveDraftMr1IncrementalReflowWorkerResponseV1,
} from "./liveDraftMr1IncrementalReflowEvidence.worker"

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-incremental-reflow-result")
  if (target == null) throw new Error("MR1 incremental reflow result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

async function run(): Promise<void> {
  const assetStartedAt = performance.now()
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_MR1_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned MR1 incremental reflow assets")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const baseInput = createFlowDocLiveDraftMr1LongBlockInputV1(1)
  const [regularFace, boldFace] = baseInput.fontFaces
  if (regularFace == null || boldFace == null) throw new Error("MR1 incremental reflow font fixture is incomplete")

  const tokenCurrent = replaceFlowDocLiveDraftMr1LongBlockTextV1({
    previous: baseInput,
    instanceRevision: 2,
    startOffset: Math.floor(baseInput.measurement.renderedText.length / 2),
    insertedText: "ก",
  })
  const tokenImpactDurationMs: number[] = []
  let tokenImpact = analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous: baseInput, current: tokenCurrent })
  for (let index = 0; index < 25; index += 1) {
    const startedAt = performance.now()
    tokenImpact = analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous: baseInput, current: tokenCurrent })
    tokenImpactDurationMs.push(performance.now() - startedAt)
  }

  const worker = new Worker(
    new URL("./liveDraftMr1IncrementalReflowEvidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-incremental-reflow-evidence" },
  )
  const completion = new Promise<FlowDocLiveDraftMr1IncrementalReflowWorkerResponseV1>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<FlowDocLiveDraftMr1IncrementalReflowWorkerResponseV1>) => resolve(event.data)
    worker.onerror = (event) => reject(new Error(event.message))
  })
  const request: FlowDocLiveDraftMr1IncrementalReflowWorkerRequestV1 = {
    type: "live-draft-mr1-incremental-reflow.run",
    measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
    wasmBytes,
    fonts: [{ face: regularFace, bytes: regularBytes }, { face: boldFace, bytes: boldBytes }],
    warmSampleCount: 10,
  }
  const workerStartedAt = performance.now()
  worker.postMessage(request, [wasmBytes, regularBytes, boldBytes])
  const response = await completion
  const workerRoundTripMs = performance.now() - workerStartedAt
  worker.terminate()
  if (response.type === "live-draft-mr1-incremental-reflow.blocked") throw new Error(response.message)
  writeResult("pass", {
    ...response,
    assetFetchDurationMs,
    workerRoundTripMs,
    tokenImpactDurationMs,
    tokenImpact,
  })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
