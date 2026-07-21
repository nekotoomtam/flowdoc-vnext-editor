import {
  createFlowDocTextEngineMr1WorkerRuntimeV1,
  type FlowDocTextEngineMr1WorkerFontV1,
} from "@flowdoc/text-engine-rust-wasm/worker-mr1"
import type {
  FlowDocTextEngineMultiRunLayoutInputV1,
  FlowDocTextEngineMultiRunLayoutResultV1,
} from "@flowdoc/text-engine-rust-wasm"
import { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 } from "@flowdoc/text-engine-rust-wasm"

interface FlowDocLiveDraftMr1WorkerRequestV1 {
  type: "live-draft-mr1.run"
  measurementProfileId: string
  wasmSha256: typeof FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256
  wasmBytes: ArrayBuffer
  fonts: FlowDocTextEngineMr1WorkerFontV1[]
  layout: Omit<FlowDocTextEngineMultiRunLayoutInputV1, "fontFaces">
  warmSampleCount: number
}

type FlowDocLiveDraftMr1WorkerResponseV1 =
  | {
      type: "live-draft-mr1.result"
      durationMs: number
      initializationDurationMs: number
      coldLayoutDurationMs: number
      warmLayoutDurationMs: number[]
      samplesConsistent: boolean
      identity: Awaited<ReturnType<typeof createFlowDocTextEngineMr1WorkerRuntimeV1>>["identity"]
      result: FlowDocTextEngineMultiRunLayoutResultV1
    }
  | { type: "live-draft-mr1.blocked"; message: string }

interface WorkerScopeV1 {
  addEventListener(type: "message", listener: (event: MessageEvent<FlowDocLiveDraftMr1WorkerRequestV1>) => void): void
  postMessage(message: FlowDocLiveDraftMr1WorkerResponseV1): void
}

const workerScope = self as unknown as WorkerScopeV1

workerScope.addEventListener("message", (event) => {
  void (async () => {
    if (event.data.type !== "live-draft-mr1.run") throw new Error("invalid MR1 Worker request")
    if (!Number.isSafeInteger(event.data.warmSampleCount)
      || event.data.warmSampleCount < 1
      || event.data.warmSampleCount > 100) throw new Error("invalid MR1 warm sample count")
    const startedAt = performance.now()
    const initializationStartedAt = performance.now()
    const runtime = await createFlowDocTextEngineMr1WorkerRuntimeV1({
      measurementProfileId: event.data.measurementProfileId,
      wasmSha256: event.data.wasmSha256,
      wasmBytes: event.data.wasmBytes,
      fonts: event.data.fonts,
    })
    const initializationDurationMs = performance.now() - initializationStartedAt
    const coldStartedAt = performance.now()
    const result = runtime.layout(event.data.layout)
    const coldLayoutDurationMs = performance.now() - coldStartedAt
    const warmResults: FlowDocTextEngineMultiRunLayoutResultV1[] = []
    const warmLayoutDurationMs = Array.from({ length: event.data.warmSampleCount }, () => {
      const sampleStartedAt = performance.now()
      warmResults.push(runtime.layout(event.data.layout))
      return performance.now() - sampleStartedAt
    })
    const reference = JSON.stringify(result)
    const samplesConsistent = warmResults.every((sample) => JSON.stringify(sample) === reference)
    workerScope.postMessage({
      type: "live-draft-mr1.result",
      durationMs: performance.now() - startedAt,
      initializationDurationMs,
      coldLayoutDurationMs,
      warmLayoutDurationMs,
      samplesConsistent,
      identity: runtime.identity,
      result,
    })
  })().catch((error: unknown) => workerScope.postMessage({
    type: "live-draft-mr1.blocked",
    message: error instanceof Error ? error.message : String(error),
  }))
})

export type { FlowDocLiveDraftMr1WorkerRequestV1, FlowDocLiveDraftMr1WorkerResponseV1 }
