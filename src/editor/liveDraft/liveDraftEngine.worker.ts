import { createFlowDocTextEngineWorkerRuntimeV1 } from "@flowdoc/text-engine-rust-wasm/worker"
import {
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  parseFlowDocLiveDraftWorkerRequestV1,
  type FlowDocLiveDraftWorkerBlockedV1,
  type FlowDocLiveDraftWorkerDiagnosticsV1,
  type FlowDocLiveDraftWorkerResponseV1,
} from "./liveDraftWorkerProtocol"

interface WorkerScopeV1 {
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void
  postMessage(message: FlowDocLiveDraftWorkerResponseV1): void
}

const workerScope = self as unknown as WorkerScopeV1
let runtime: Awaited<ReturnType<typeof createFlowDocTextEngineWorkerRuntimeV1>> | null = null
const cancelled = new Set<string>()

function cancellationKey(requestId: string, requestRevision: number): string {
  return `${requestRevision}:${requestId}`
}

function blocked(message: string, requestId: string | null, requestRevision: number | null): FlowDocLiveDraftWorkerBlockedV1 {
  return {
    protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
    type: "live-draft.blocked",
    exactness: "draft-blocked",
    requestId,
    requestRevision,
    message,
  }
}

workerScope.addEventListener("message", (event) => {
  void (async () => {
    const request = parseFlowDocLiveDraftWorkerRequestV1(event.data)
    if (request == null) {
      workerScope.postMessage(blocked("invalid live-draft worker request", null, null))
      return
    }
    if (request.type === "live-draft.cancel") {
      cancelled.add(cancellationKey(request.requestId, request.requestRevision))
      return
    }
    if (request.type === "live-draft.initialize") {
      if (runtime != null) {
        workerScope.postMessage(blocked("text engine is already initialized", null, null))
        return
      }
      const startedAt = performance.now()
      runtime = await createFlowDocTextEngineWorkerRuntimeV1(request)
      const diagnostics: FlowDocLiveDraftWorkerDiagnosticsV1 = {
        protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
        type: "live-draft.diagnostics",
        status: "initialized",
        durationMs: performance.now() - startedAt,
        engineIdentity: runtime.identity,
      }
      workerScope.postMessage(diagnostics)
      return
    }
    if (runtime == null) {
      workerScope.postMessage(blocked("text engine is not initialized", request.identity.requestId, request.identity.requestRevision))
      return
    }
    if (
      request.identity.measurementProfileId !== runtime.identity.measurementProfileId
      || request.identity.wasmSha256 !== runtime.identity.wasmSha256
      || request.smokeRow.fontSha256 !== runtime.identity.fontSha256ById[request.smokeRow.fontId]
    ) {
      workerScope.postMessage(blocked("runtime/profile/font identity mismatch", request.identity.requestId, request.identity.requestRevision))
      return
    }
    const key = cancellationKey(request.identity.requestId, request.identity.requestRevision)
    if (cancelled.delete(key)) return
    const startedAt = performance.now()
    const measurement = runtime.measure({
      text: request.smokeRow.text,
      fontId: request.smokeRow.fontId,
      fontSha256: request.smokeRow.fontSha256,
    })
    if (cancelled.delete(key)) return
    workerScope.postMessage({
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.result",
      exactness: "draft-current",
      identity: request.identity,
      smokeRow: request.smokeRow,
      measurement,
      durationMs: performance.now() - startedAt,
    })
  })().catch((error: unknown) => {
    workerScope.postMessage(blocked(error instanceof Error ? error.message : String(error), null, null))
  })
})
