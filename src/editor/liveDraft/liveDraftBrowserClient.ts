import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import { createVNextCompactFingerprint } from "../../core/coreAdapter"
import type { FlowDocLiveDraftFormProjectionResultV1 } from "./liveDraftFormProjection"
import {
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  type FlowDocLiveDraftFormResultV1,
  type FlowDocLiveDraftWorkerResponseV1,
} from "./liveDraftWorkerProtocol"

type ReadyProjection = Extract<FlowDocLiveDraftFormProjectionResultV1, { status: "ready" }>

export const FLOWDOC_LIVE_DRAFT_FORM_LAYOUT_PIPELINE_VERSION = "live-draft-xr3-form-one-block-v1" as const

export interface FlowDocLiveDraftFormClientV1 {
  layout(input: { projection: ReadyProjection; requestId: string }): Promise<FlowDocLiveDraftFormResultV1>
  cancel(input: { requestId: string; requestRevision: number }): void
  dispose(): void
}

export interface FlowDocLiveDraftFormClientOptionsV1 {
  availableWidthPt?: number
  fontSizePt?: number
  lineHeightPt?: number
  pageBodyHeightPt?: number
}

const fontId = "sarabun-regular"
const fontSha256 = "b8150084e25734e6f31696c57ff009f5564efa09d295848b717d9e2328c0311d"

export function createFlowDocLiveDraftBrowserClientV1(
  options: FlowDocLiveDraftFormClientOptionsV1 = {},
): FlowDocLiveDraftFormClientV1 {
  const worker = new Worker(
    new URL("./liveDraftEngine.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-xr3-form" },
  )
  const pending = new Map<string, {
    resolve: (result: FlowDocLiveDraftFormResultV1) => void
    reject: (error: Error) => void
  }>()
  const awaitingDispatch = new Set<string>()
  const cancelledBeforeDispatch = new Set<string>()
  let disposed = false
  let initialized: Promise<void> | null = null
  let initializationResolve: (() => void) | null = null
  let initializationReject: ((error: Error) => void) | null = null

  worker.addEventListener("message", (event: MessageEvent<FlowDocLiveDraftWorkerResponseV1>) => {
    const response = event.data
    if (response.type === "live-draft.diagnostics") {
      if (
        response.engineIdentity.measurementProfileId !== FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId
        || response.engineIdentity.wasmSha256 !== FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256
        || response.engineIdentity.fontSha256ById[fontId] !== fontSha256
      ) {
        initializationReject?.(new Error("Live Draft Worker identity mismatch"))
        return
      }
      initializationResolve?.()
      return
    }
    if (response.type === "live-draft.blocked") {
      const error = new Error(response.message)
      if (response.requestId == null) {
        initializationReject?.(error)
        pending.forEach((waiter) => waiter.reject(error))
        pending.clear()
      } else {
        pending.get(response.requestId)?.reject(error)
        pending.delete(response.requestId)
      }
      return
    }
    if (response.type !== "live-draft.form-result") return
    const waiter = pending.get(response.identity.requestId)
    if (waiter == null) return
    pending.delete(response.identity.requestId)
    waiter.resolve(response)
  })
  worker.addEventListener("error", (event) => {
    const error = new Error(event.message || "Live Draft Worker failed")
    initializationReject?.(error)
    pending.forEach((waiter) => waiter.reject(error))
    pending.clear()
  })

  const ensureInitialized = (): Promise<void> => {
    initialized ??= (async () => {
      const [wasmResponse, fontResponse] = await Promise.all([
        fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_WASM_URL),
        fetch(FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL),
      ])
      if (!wasmResponse.ok || !fontResponse.ok) throw new Error("Live Draft assets are unavailable")
      const [wasmBytes, fontBytes] = await Promise.all([wasmResponse.arrayBuffer(), fontResponse.arrayBuffer()])
      if (disposed) throw new Error("Live Draft client is disposed")
      await new Promise<void>((resolve, reject) => {
        initializationResolve = resolve
        initializationReject = reject
        worker.postMessage({
          protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
          type: "live-draft.initialize",
          measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
          wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
          wasmBytes,
          fonts: [{ fontId, sha256: fontSha256, bytes: fontBytes }],
        }, [wasmBytes, fontBytes])
      })
    })()
    return initialized
  }

  return {
    async layout({ projection, requestId }) {
      if (disposed) throw new Error("Live Draft client is disposed")
      awaitingDispatch.add(requestId)
      try {
        await ensureInitialized()
      } catch (error: unknown) {
        awaitingDispatch.delete(requestId)
        cancelledBeforeDispatch.delete(requestId)
        throw error
      }
      if (disposed) throw new Error("Live Draft client is disposed")
      awaitingDispatch.delete(requestId)
      if (cancelledBeforeDispatch.delete(requestId)) {
        throw new Error("Live Draft request cancelled before dispatch")
      }
      const result = new Promise<FlowDocLiveDraftFormResultV1>((resolve, reject) => {
        pending.set(requestId, { resolve, reject })
      })
      const assetRegistryFingerprint = createVNextCompactFingerprint(JSON.stringify({
        fontId,
        fontSha256,
        wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
      }))
      worker.postMessage({
        protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
        type: "live-draft.form-layout",
        identity: {
          documentId: projection.documentId,
          structureRevision: projection.structureRevision,
          draftSnapshotFingerprint: projection.draftSnapshotFingerprint,
          canonicalFormCandidateFingerprint: projection.canonicalFormCandidateFingerprint,
          assetRegistryFingerprint,
          measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
          fontManifestFingerprint: createVNextCompactFingerprint(`${fontId}:${fontSha256}`),
          wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
          layoutPipelineVersion: FLOWDOC_LIVE_DRAFT_FORM_LAYOUT_PIPELINE_VERSION,
          requestId,
          requestRevision: projection.formRevision,
        },
        textBlock: {
          textBlockId: `live-draft-form:${projection.fieldKey}`,
          fieldKey: projection.fieldKey,
          text: projection.text,
          fontId,
          fontSha256,
        },
        coreLayout: {
          availableWidthPt: options.availableWidthPt ?? 180,
          fontSizePt: options.fontSizePt ?? 12,
          lineHeightPt: options.lineHeightPt ?? 18,
          pageBodyHeightPt: options.pageBodyHeightPt ?? 252,
          styleKey: "paragraph/sarabun-regular-12-18",
          cacheAction: "clear-before",
        },
      })
      return result
    },
    cancel(input) {
      if (disposed) return
      if (awaitingDispatch.has(input.requestId)) {
        cancelledBeforeDispatch.add(input.requestId)
        return
      }
      const waiter = pending.get(input.requestId)
      if (waiter == null) return
      pending.delete(input.requestId)
      waiter.reject(new Error("Live Draft request cancelled"))
      worker.postMessage({
        protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
        type: "live-draft.cancel",
        requestId: input.requestId,
        requestRevision: input.requestRevision,
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      const error = new Error("Live Draft client disposed")
      initializationReject?.(error)
      pending.forEach((waiter) => waiter.reject(error))
      pending.clear()
      awaitingDispatch.clear()
      cancelledBeforeDispatch.clear()
      worker.terminate()
    },
  }
}
