import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1"
import {
  FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
} from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocLiveDraftMr1LayoutInputV1,
  FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
} from "./liveDraftMr1Fixture"
import type {
  FlowDocLiveDraftMr1WorkerRequestV1,
  FlowDocLiveDraftMr1WorkerResponseV1,
} from "./liveDraftMr1Evidence.worker"

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-result")
  if (target == null) throw new Error("MR1 result target is missing")
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
    throw new Error("failed to load pinned MR1 WASM/font bytes")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const layoutInput = createFlowDocLiveDraftMr1LayoutInputV1()
  const [regularFace, boldFace] = layoutInput.fontFaces
  if (regularFace == null || boldFace == null) throw new Error("MR1 font-face fixture is incomplete")
  const { fontFaces: _fontFaces, ...workerLayout } = layoutInput
  const worker = new Worker(
    new URL("./liveDraftMr1Evidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-evidence" },
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
    fonts: [
      { face: regularFace, bytes: regularBytes },
      { face: boldFace, bytes: boldBytes },
    ],
    layout: workerLayout,
    warmSampleCount: 25,
  }
  const roundTripStartedAt = performance.now()
  worker.postMessage(request, [wasmBytes, regularBytes, boldBytes])
  const workerResponse = await response
  const workerRoundTripMs = performance.now() - roundTripStartedAt
  worker.terminate()
  if (workerResponse.type !== "live-draft-mr1.result") throw new Error(workerResponse.message)
  if (workerResponse.result.status !== "accepted") {
    throw new Error(workerResponse.result.issues.map((item) => item.message).join("\n"))
  }
  writeResult("pass", {
    assetFetchDurationMs,
    workerRoundTripMs,
    workerDurationMs: workerResponse.durationMs,
    initializationDurationMs: workerResponse.initializationDurationMs,
    coldLayoutDurationMs: workerResponse.coldLayoutDurationMs,
    warmLayoutDurationMs: workerResponse.warmLayoutDurationMs,
    samplesConsistent: workerResponse.samplesConsistent,
    identity: workerResponse.identity,
    result: workerResponse.result,
  })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
