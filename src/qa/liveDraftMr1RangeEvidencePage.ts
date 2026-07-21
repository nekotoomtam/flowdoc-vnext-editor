import {
  FLOWDOC_TEXT_ENGINE_MR1_RANGE_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_RANGE_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1-range"
import {
  FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_SHA256,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1,
} from "@flowdoc/text-engine-rust-wasm"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"
import type {
  FlowDocLiveDraftMr1RangeWorkerRequestV1,
  FlowDocLiveDraftMr1RangeWorkerResponseV1,
} from "./liveDraftMr1RangeEvidence.worker"

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-range-result")
  if (target == null) throw new Error("MR1 range result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

async function run(): Promise<void> {
  const assetStartedAt = performance.now()
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_RANGE_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_RANGE_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned MR1 range assets")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const [regularFace, boldFace] = FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1
  const worker = new Worker(
    new URL("./liveDraftMr1RangeEvidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-range-evidence" },
  )
  const completion = new Promise<FlowDocLiveDraftMr1RangeWorkerResponseV1>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<FlowDocLiveDraftMr1RangeWorkerResponseV1>) => resolve(event.data)
    worker.onerror = (event) => reject(new Error(event.message))
  })
  const request: FlowDocLiveDraftMr1RangeWorkerRequestV1 = {
    type: "live-draft-mr1-range.run",
    measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_SHA256,
    wasmBytes,
    fonts: [
      { face: structuredClone(regularFace), bytes: regularBytes },
      { face: structuredClone(boldFace), bytes: boldBytes },
    ],
    warmSampleCount: 10,
  }
  const workerStartedAt = performance.now()
  worker.postMessage(request, [wasmBytes, regularBytes, boldBytes])
  const response = await completion
  const workerRoundTripMs = performance.now() - workerStartedAt
  worker.terminate()
  if (response.type === "live-draft-mr1-range.blocked") throw new Error(response.message)
  writeResult("pass", { ...response, assetFetchDurationMs, workerRoundTripMs })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
