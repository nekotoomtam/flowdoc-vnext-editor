import {
  createFlowDocTextEngineMr1WorkerRuntimeV1,
  type FlowDocTextEngineMr1WorkerFontV1,
  type FlowDocTextEngineMr1WorkerIdentityV1,
  type FlowDocTextEngineMr1WorkerRuntimeV1,
} from "@flowdoc/text-engine-rust-wasm/worker-mr1"
import {
  FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
  type FlowDocTextEngineMultiRunLayoutInputV1,
  type FlowDocTextEngineMultiRunLayoutResultV1,
} from "@flowdoc/text-engine-rust-wasm"

interface InitializeRequestV1 {
  type: "live-draft-mr1-multi-block.initialize"
  measurementProfileId: string
  wasmSha256: typeof FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256
  wasmBytes: ArrayBuffer
  fonts: FlowDocTextEngineMr1WorkerFontV1[]
}

interface LayoutRequestV1 {
  type: "live-draft-mr1-multi-block.layout"
  requestId: string
  textBlockId: string
  contentFingerprint: string
  responseDelayMs: number
  layout: Omit<FlowDocTextEngineMultiRunLayoutInputV1, "fontFaces">
}

export type FlowDocLiveDraftMr1MultiBlockWorkerRequestV1 = InitializeRequestV1 | LayoutRequestV1

export type FlowDocLiveDraftMr1MultiBlockWorkerResponseV1 =
  | { type: "live-draft-mr1-multi-block.initialized"; identity: FlowDocTextEngineMr1WorkerIdentityV1 }
  | {
      type: "live-draft-mr1-multi-block.result"
      requestId: string
      textBlockId: string
      contentFingerprint: string
      workerDurationMs: number
      result: FlowDocTextEngineMultiRunLayoutResultV1
    }
  | { type: "live-draft-mr1-multi-block.blocked"; requestId: string | null; message: string }

interface WorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<FlowDocLiveDraftMr1MultiBlockWorkerRequestV1>) => void,
  ): void
  postMessage(message: FlowDocLiveDraftMr1MultiBlockWorkerResponseV1): void
}

const workerScope = self as unknown as WorkerScopeV1
let runtime: FlowDocTextEngineMr1WorkerRuntimeV1 | null = null

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

workerScope.addEventListener("message", (event) => {
  const request = event.data
  void (async () => {
    if (request.type === "live-draft-mr1-multi-block.initialize") {
      if (runtime != null) throw new Error("MR1 multi-block Worker was already initialized")
      runtime = await createFlowDocTextEngineMr1WorkerRuntimeV1({
        measurementProfileId: request.measurementProfileId,
        wasmSha256: request.wasmSha256,
        wasmBytes: request.wasmBytes,
        fonts: request.fonts,
      })
      workerScope.postMessage({ type: "live-draft-mr1-multi-block.initialized", identity: runtime.identity })
      return
    }
    if (runtime == null) throw new Error("MR1 multi-block Worker is not initialized")
    if (!Number.isFinite(request.responseDelayMs) || request.responseDelayMs < 0 || request.responseDelayMs > 1_000) {
      throw new Error("MR1 multi-block response delay is invalid")
    }
    const startedAt = performance.now()
    const result = runtime.layout(request.layout)
    const workerDurationMs = performance.now() - startedAt
    await wait(request.responseDelayMs)
    workerScope.postMessage({
      type: "live-draft-mr1-multi-block.result",
      requestId: request.requestId,
      textBlockId: request.textBlockId,
      contentFingerprint: request.contentFingerprint,
      workerDurationMs,
      result,
    })
  })().catch((error: unknown) => workerScope.postMessage({
    type: "live-draft-mr1-multi-block.blocked",
    requestId: request.type === "live-draft-mr1-multi-block.layout" ? request.requestId : null,
    message: error instanceof Error ? error.message : String(error),
  }))
})
