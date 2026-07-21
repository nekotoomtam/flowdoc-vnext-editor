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
  type: "live-draft-mr1-lifecycle.initialize"
  measurementProfileId: string
  wasmSha256: typeof FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256
  wasmBytes: ArrayBuffer
  fonts: FlowDocTextEngineMr1WorkerFontV1[]
}

interface LayoutRequestV1 {
  type: "live-draft-mr1-lifecycle.layout"
  requestId: string
  documentRevision: number
  contentFingerprint: string
  responseDelayMs: number
  layout: Omit<FlowDocTextEngineMultiRunLayoutInputV1, "fontFaces">
}

type FlowDocLiveDraftMr1LifecycleWorkerRequestV1 = InitializeRequestV1 | LayoutRequestV1

type FlowDocLiveDraftMr1LifecycleWorkerResponseV1 =
  | {
      type: "live-draft-mr1-lifecycle.initialized"
      identity: FlowDocTextEngineMr1WorkerIdentityV1
    }
  | {
      type: "live-draft-mr1-lifecycle.result"
      requestId: string
      documentRevision: number
      contentFingerprint: string
      workerDurationMs: number
      result: FlowDocTextEngineMultiRunLayoutResultV1
    }
  | {
      type: "live-draft-mr1-lifecycle.blocked"
      requestId: string | null
      message: string
    }

interface WorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<FlowDocLiveDraftMr1LifecycleWorkerRequestV1>) => void,
  ): void
  postMessage(message: FlowDocLiveDraftMr1LifecycleWorkerResponseV1): void
}

const workerScope = self as unknown as WorkerScopeV1
let runtime: FlowDocTextEngineMr1WorkerRuntimeV1 | null = null

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

workerScope.addEventListener("message", (event) => {
  const request = event.data
  void (async () => {
    if (request.type === "live-draft-mr1-lifecycle.initialize") {
      if (runtime != null) throw new Error("MR1 lifecycle Worker was already initialized")
      runtime = await createFlowDocTextEngineMr1WorkerRuntimeV1({
        measurementProfileId: request.measurementProfileId,
        wasmSha256: request.wasmSha256,
        wasmBytes: request.wasmBytes,
        fonts: request.fonts,
      })
      workerScope.postMessage({
        type: "live-draft-mr1-lifecycle.initialized",
        identity: runtime.identity,
      })
      return
    }
    if (runtime == null) throw new Error("MR1 lifecycle Worker is not initialized")
    if (!Number.isSafeInteger(request.documentRevision) || request.documentRevision < 0) {
      throw new Error("MR1 lifecycle revision is invalid")
    }
    if (!Number.isFinite(request.responseDelayMs)
      || request.responseDelayMs < 0
      || request.responseDelayMs > 1_000) {
      throw new Error("MR1 lifecycle response delay is invalid")
    }
    const startedAt = performance.now()
    const result = runtime.layout(request.layout)
    const workerDurationMs = performance.now() - startedAt
    await wait(request.responseDelayMs)
    workerScope.postMessage({
      type: "live-draft-mr1-lifecycle.result",
      requestId: request.requestId,
      documentRevision: request.documentRevision,
      contentFingerprint: request.contentFingerprint,
      workerDurationMs,
      result,
    })
  })().catch((error: unknown) => workerScope.postMessage({
    type: "live-draft-mr1-lifecycle.blocked",
    requestId: request.type === "live-draft-mr1-lifecycle.layout" ? request.requestId : null,
    message: error instanceof Error ? error.message : String(error),
  }))
})

export type {
  FlowDocLiveDraftMr1LifecycleWorkerRequestV1,
  FlowDocLiveDraftMr1LifecycleWorkerResponseV1,
}
