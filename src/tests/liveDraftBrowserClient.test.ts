import { afterEach, describe, expect, it, vi } from "vitest"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import { createFlowDocLiveDraftBrowserClientV1 } from "../editor/liveDraft/liveDraftBrowserClient"
import type { FlowDocLiveDraftFormProjectionResultV1 } from "../editor/liveDraft/liveDraftFormProjection"
import type { FlowDocLiveDraftWorkerResponseV1 } from "../editor/liveDraft/liveDraftWorkerProtocol"

type ReadyProjection = Extract<FlowDocLiveDraftFormProjectionResultV1, { status: "ready" }>

const projection: ReadyProjection = {
  contractVersion: "live-draft-form-projection-xr3-v1",
  status: "ready",
  documentId: "document-1",
  structureRevision: 1,
  formRevision: 1,
  fieldKey: "documentTitle",
  text: "Prepared report",
  draftSnapshotFingerprint: "draft:1",
  canonicalFormCandidateFingerprint: "candidate:1",
  contracts: {
    selectedScalarOnly: true,
    wholeDocumentResolution: false,
    backendAdmission: false,
    storage: "memory-only",
  },
}

class FakeWorker {
  static latest: FakeWorker | null = null
  readonly posted: unknown[] = []
  private readonly messageListeners: Array<(event: MessageEvent<FlowDocLiveDraftWorkerResponseV1>) => void> = []

  constructor() {
    FakeWorker.latest = this
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "message") {
      this.messageListeners.push(listener as (event: MessageEvent<FlowDocLiveDraftWorkerResponseV1>) => void)
    }
  }

  postMessage(message: unknown): void {
    this.posted.push(message)
  }

  terminate(): void {}

  emit(response: FlowDocLiveDraftWorkerResponseV1): void {
    this.messageListeners.forEach((listener) => listener({ data: response } as MessageEvent<FlowDocLiveDraftWorkerResponseV1>))
  }
}

function diagnostics(): FlowDocLiveDraftWorkerResponseV1 {
  return {
    protocolVersion: 1,
    type: "live-draft.diagnostics",
    status: "initialized",
    durationMs: 1,
    engineIdentity: {
      runtime: "browser-worker-wasm",
      measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
      wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
      boundaryVersion: "flowdoc-text-engine-wasm-live-draft-xr1-v1",
      fontSha256ById: {
        "sarabun-regular": "b8150084e25734e6f31696c57ff009f5564efa09d295848b717d9e2328c0311d",
      },
      importsWasm: true,
      executesRustybuzz: true,
      executesIcu4x: true,
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  FakeWorker.latest = null
})

describe("LIVE-DRAFT-XR-3 browser client cancellation", () => {
  it("does not dispatch a layout that was cancelled during initialization", async () => {
    vi.stubGlobal("Worker", FakeWorker)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]))))
    const client = createFlowDocLiveDraftBrowserClientV1()
    const layout = client.layout({ projection, requestId: "request:1" })
    const worker = FakeWorker.latest!
    await vi.waitFor(() => expect(worker.posted).toHaveLength(1))

    client.cancel({ requestId: "request:1", requestRevision: 1 })
    worker.emit(diagnostics())

    await expect(layout).rejects.toThrow("cancelled before dispatch")
    expect(worker.posted).toHaveLength(1)
    expect(worker.posted[0]).toMatchObject({ type: "live-draft.initialize" })
    client.dispose()
  })

  it("rejects local pending work when a dispatched request is cancelled", async () => {
    vi.stubGlobal("Worker", FakeWorker)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]))))
    const client = createFlowDocLiveDraftBrowserClientV1()
    const layout = client.layout({ projection, requestId: "request:1" })
    const worker = FakeWorker.latest!
    await vi.waitFor(() => expect(worker.posted).toHaveLength(1))
    worker.emit(diagnostics())
    await vi.waitFor(() => expect(worker.posted).toHaveLength(2))

    client.cancel({ requestId: "request:1", requestRevision: 1 })

    await expect(layout).rejects.toThrow("request cancelled")
    expect(worker.posted[1]).toMatchObject({ type: "live-draft.form-layout" })
    expect(worker.posted[2]).toMatchObject({ type: "live-draft.cancel" })
    client.dispose()
  })
})
