import {
  createFlowDocTextEngineLiveDraftMeasurementV1,
  createFlowDocTextEngineWorkerRuntimeV1,
  type FlowDocTextEngineLiveDraftNormalizedResultV1,
} from "@flowdoc/text-engine-rust-wasm/worker"
import { createCoreLiveDraftOneBlockLayoutSessionV1 } from "../../core/coreAdapter"
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
let coreLayoutSession: ReturnType<typeof createCoreLiveDraftOneBlockLayoutSessionV1> | null = null
const normalizedMeasurementByKey = new Map<string, FlowDocTextEngineLiveDraftNormalizedResultV1>()
const cancelled = new Set<string>()
const maxRetainedCancellationKeys = 128

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
      if (cancelled.size >= maxRetainedCancellationKeys) {
        const oldest = cancelled.values().next().value
        if (oldest != null) cancelled.delete(oldest)
      }
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
      coreLayoutSession = createCoreLiveDraftOneBlockLayoutSessionV1({
        measurementProfileId: runtime.identity.measurementProfileId,
        profileRevision: runtime.identity.boundaryVersion,
      })
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
    const textBlock = request.type === "live-draft.form-layout" ? request.textBlock : request.smokeRow
    if (
      request.identity.measurementProfileId !== runtime.identity.measurementProfileId
      || request.identity.wasmSha256 !== runtime.identity.wasmSha256
      || textBlock.fontSha256 !== runtime.identity.fontSha256ById[textBlock.fontId]
    ) {
      workerScope.postMessage(blocked("runtime/profile/font identity mismatch", request.identity.requestId, request.identity.requestRevision))
      return
    }
    const key = cancellationKey(request.identity.requestId, request.identity.requestRevision)
    if (cancelled.delete(key)) return
    const startedAt = performance.now()
    const measurementKey = `${textBlock.fontSha256}\u0000${textBlock.text}`
    const coreLayoutInput = request.coreLayout
    let measurement: FlowDocTextEngineLiveDraftNormalizedResultV1
    let coreLayout
    if (request.type === "live-draft.layout" && request.coreLayout == null) {
      measurement = runtime.measure({
        text: textBlock.text,
        fontId: textBlock.fontId,
        fontSha256: textBlock.fontSha256,
      })
    } else {
      if (coreLayoutSession == null) throw new Error("Core layout session is not initialized")
      if (coreLayoutInput == null) throw new Error("Core layout input is missing")
      if (coreLayoutInput.cacheAction === "clear-before") {
        coreLayoutSession.clearCache()
        normalizedMeasurementByKey.clear()
      }
      coreLayout = coreLayoutSession.layout({
        documentId: request.identity.documentId,
        instanceRevision: request.identity.structureRevision,
        sectionId: "live-draft-xr2-section",
        textBlockId: request.type === "live-draft.form-layout"
          ? request.textBlock.textBlockId
          : `live-draft-xr2:${request.smokeRow.rowId}`,
        text: textBlock.text,
        availableWidthPt: coreLayoutInput.availableWidthPt,
        pageBodyHeightPt: coreLayoutInput.pageBodyHeightPt,
        styleKey: coreLayoutInput.styleKey,
        ...(request.type === "live-draft.form-layout" ? { displayList: request.coreLayout.displayList } : {}),
      }, (engineInput) => {
        const normalized = runtime!.measure({
          text: engineInput.text,
          fontId: textBlock.fontId,
          fontSha256: textBlock.fontSha256,
        })
        normalizedMeasurementByKey.set(measurementKey, normalized)
        return createFlowDocTextEngineLiveDraftMeasurementV1({
          measurement: normalized,
          availableWidthPt: engineInput.availableWidthPt,
          fontSizePt: coreLayoutInput.fontSizePt,
          lineHeightPt: coreLayoutInput.lineHeightPt,
        })
      })
      const cachedMeasurement = normalizedMeasurementByKey.get(measurementKey)
      if (cachedMeasurement == null) throw new Error("normalized measurement cache is missing")
      measurement = cachedMeasurement
    }
    if (cancelled.delete(key)) return
    if (request.type === "live-draft.form-layout") {
      if (coreLayout == null) throw new Error("Core Form layout result is missing")
      if (coreLayout.displayList == null) throw new Error("Core Form display list is missing")
      workerScope.postMessage({
        protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
        type: "live-draft.form-result",
        exactness: "draft-current",
        identity: request.identity,
        textBlock: request.textBlock,
        coreLayout,
        durationMs: performance.now() - startedAt,
      })
      return
    }
    workerScope.postMessage({
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.result",
      exactness: "draft-current",
      identity: request.identity,
      smokeRow: request.smokeRow,
      measurement,
      ...(coreLayout == null ? {} : { coreLayout }),
      durationMs: performance.now() - startedAt,
    })
  })().catch((error: unknown) => {
    workerScope.postMessage(blocked(error instanceof Error ? error.message : String(error), null, null))
  })
})
