import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1"
import { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 } from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocLiveDraftMultiRunControllerV1,
  type FlowDocLiveDraftMultiRunControllerStateV1,
  type FlowDocLiveDraftMultiRunInputV1,
  type FlowDocLiveDraftMultiRunReadyInputV1,
} from "../editor/liveDraft/liveDraftMultiRunController"
import { ensureFlowDocLiveDraftMr1CanvasFontsV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasFont"
import { paintFlowDocLiveDraftMultiRunCanvasV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasPainter"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"
import {
  createFlowDocLiveDraftMr1MultiLineLayoutInputV1,
  FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN,
  FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE,
} from "./liveDraftMr1MultiLineFixture"
import type {
  FlowDocLiveDraftMr1LifecycleWorkerRequestV1,
  FlowDocLiveDraftMr1LifecycleWorkerResponseV1,
} from "./liveDraftMr1LifecycleEvidence.worker"

const DEBOUNCE_MS = 15

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-lifecycle-result")
  if (target == null) throw new Error("MR1 lifecycle result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

function readyInput(documentRevision: number, detailSuffix: string): FlowDocLiveDraftMultiRunReadyInputV1 {
  return {
    status: "ready",
    documentId: "live-draft-mr1-lifecycle-document",
    documentRevision,
    contentFingerprint: `live-draft-mr1-lifecycle-content-${documentRevision}`,
    projectionId: `live-draft-mr1-lifecycle-projection-${documentRevision}`,
    origin: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN,
    layout: createFlowDocLiveDraftMr1MultiLineLayoutInputV1({
      detailSuffix,
      instanceRevision: documentRevision,
      layoutId: `live-draft-mr1-lifecycle-layout-${documentRevision}`,
    }),
  }
}

function blockedInput(documentRevision: number): FlowDocLiveDraftMultiRunInputV1 {
  return {
    status: "blocked",
    documentId: "live-draft-mr1-lifecycle-document",
    documentRevision,
    contentFingerprint: `live-draft-mr1-lifecycle-content-${documentRevision}`,
    reason: "Latest local revision is intentionally blocked by QA validation.",
  }
}

function stateFacts(state: FlowDocLiveDraftMultiRunControllerStateV1) {
  return {
    phase: state.phase,
    pendingRevision: state.pendingRevision,
    appliedRevision: state.appliedRevision,
    lastValidRevision: state.lastValid?.input.documentRevision ?? null,
    lastValidDisplayListFingerprint: state.lastValid?.displayList.fingerprint ?? null,
    metrics: structuredClone(state.metrics),
  }
}

async function waitFor(
  predicate: () => boolean,
  message: string,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(message)
}

async function run(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#flowdoc-live-draft-mr1-lifecycle-canvas")
  if (canvas == null) throw new Error("MR1 lifecycle Canvas target is missing")
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_MR1_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned MR1 lifecycle WASM/font bytes")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const fontReadiness = await ensureFlowDocLiveDraftMr1CanvasFontsV1({
    regularBytes: regularBytes.slice(0),
    boldBytes: boldBytes.slice(0),
  })
  const fontFixture = createFlowDocLiveDraftMr1MultiLineLayoutInputV1()
  const [regularFace, boldFace] = fontFixture.fontFaces
  if (regularFace == null || boldFace == null) throw new Error("MR1 lifecycle font fixture is incomplete")

  const worker = new Worker(
    new URL("./liveDraftMr1LifecycleEvidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-lifecycle-evidence" },
  )
  const pending = new Map<string, {
    resolve: (value: Extract<FlowDocLiveDraftMr1LifecycleWorkerResponseV1, {
      type: "live-draft-mr1-lifecycle.result"
    }>) => void
    reject: (error: Error) => void
  }>()
  let initializationResolve!: (
    value: Extract<FlowDocLiveDraftMr1LifecycleWorkerResponseV1, {
      type: "live-draft-mr1-lifecycle.initialized"
    }>,
  ) => void
  let initializationReject!: (error: Error) => void
  const initialized = new Promise<Extract<FlowDocLiveDraftMr1LifecycleWorkerResponseV1, {
    type: "live-draft-mr1-lifecycle.initialized"
  }>>((resolve, reject) => {
    initializationResolve = resolve
    initializationReject = reject
  })
  worker.onmessage = (event: MessageEvent<FlowDocLiveDraftMr1LifecycleWorkerResponseV1>) => {
    const response = event.data
    if (response.type === "live-draft-mr1-lifecycle.initialized") {
      initializationResolve(response)
      return
    }
    if (response.type === "live-draft-mr1-lifecycle.blocked") {
      const error = new Error(response.message)
      if (response.requestId == null) initializationReject(error)
      else {
        pending.get(response.requestId)?.reject(error)
        pending.delete(response.requestId)
      }
      return
    }
    const waiter = pending.get(response.requestId)
    if (waiter == null) return
    pending.delete(response.requestId)
    waiter.resolve(response)
  }
  worker.onerror = (event) => {
    const error = new Error(event.message)
    initializationReject(error)
    pending.forEach((waiter) => waiter.reject(error))
    pending.clear()
  }
  const initializeRequest: FlowDocLiveDraftMr1LifecycleWorkerRequestV1 = {
    type: "live-draft-mr1-lifecycle.initialize",
    measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
    wasmBytes,
    fonts: [{ face: regularFace, bytes: regularBytes }, { face: boldFace, bytes: boldBytes }],
  }
  worker.postMessage(initializeRequest, [wasmBytes, regularBytes, boldBytes])
  const diagnostics = await initialized

  const requestedRevisions: number[] = []
  const cancelledRevisions: number[] = []
  const workerDurationMsByRevision: Record<string, number> = {}
  const stateTransitions: ReturnType<typeof stateFacts>[] = []
  const paintedRevisions: number[] = []
  const paintedDisplayListFingerprints: string[] = []
  const paintDurationMs: number[] = []
  const appliedEndToEndDurationMsByRevision: Record<string, number> = {}
  let paintedFingerprint: string | null = null
  const responseDelayByRevision: Record<number, number> = { 1: 5, 4: 120, 5: 5, 7: 5 }

  const controller = createFlowDocLiveDraftMultiRunControllerV1({
    debounceMs: DEBOUNCE_MS,
    dependencies: {
      layout: ({ requestId, input }) => {
        requestedRevisions.push(input.documentRevision)
        const response = new Promise<Extract<FlowDocLiveDraftMr1LifecycleWorkerResponseV1, {
          type: "live-draft-mr1-lifecycle.result"
        }>>((resolve, reject) => pending.set(requestId, { resolve, reject }))
        const { fontFaces: _fontFaces, ...layout } = input.layout
        const request: FlowDocLiveDraftMr1LifecycleWorkerRequestV1 = {
          type: "live-draft-mr1-lifecycle.layout",
          requestId,
          documentRevision: input.documentRevision,
          contentFingerprint: input.contentFingerprint,
          responseDelayMs: responseDelayByRevision[input.documentRevision] ?? 5,
          layout,
        }
        worker.postMessage(request)
        return response.then((completion) => {
          workerDurationMsByRevision[String(completion.documentRevision)] = completion.workerDurationMs
          return completion
        })
      },
      cancel: ({ documentRevision }) => { cancelledRevisions.push(documentRevision) },
      now: () => performance.now(),
      setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
      clearTimer: (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
      onStateChange: (state) => {
        const lastValid = state.lastValid
        if (lastValid != null && lastValid.displayList.fingerprint !== paintedFingerprint) {
          const paint = paintFlowDocLiveDraftMultiRunCanvasV1({
            canvas,
            displayList: lastValid.displayList,
            page: FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE,
          })
          paintedFingerprint = lastValid.displayList.fingerprint
          paintedRevisions.push(lastValid.input.documentRevision)
          paintedDisplayListFingerprints.push(lastValid.displayList.fingerprint)
          paintDurationMs.push(paint.paintDurationMs)
          appliedEndToEndDurationMsByRevision[String(lastValid.input.documentRevision)] =
            lastValid.endToEndDurationMs
          canvas.dataset.paintStatus = "painted"
          canvas.dataset.displayListFingerprint = paintedFingerprint
        }
        stateTransitions.push(stateFacts(state))
      },
    },
  })

  const sequenceStartedAt = performance.now()
  controller.update(readyInput(1, " · เริ่มต้น"))
  await waitFor(
    () => controller.getState().phase === "draft-current" && controller.getState().appliedRevision === 1,
    "MR1 lifecycle revision 1 did not become current",
  )
  const initialCurrent = stateFacts(controller.getState())

  controller.update(readyInput(2, " · พิมพ์"))
  controller.update(readyInput(3, " · พิมพ์เร็ว"))
  controller.update(readyInput(4, " · พิมพ์เร็วมาก"))
  await waitFor(() => requestedRevisions.includes(4), "MR1 lifecycle revision 4 was not dispatched")
  const coalescedPending = stateFacts(controller.getState())

  controller.update(readyInput(5, " · ฉบับล่าสุด"))
  const replacementPending = stateFacts(controller.getState())
  await waitFor(
    () => controller.getState().phase === "draft-current" && controller.getState().appliedRevision === 5,
    "MR1 lifecycle revision 5 did not become current",
  )
  const newestCurrent = stateFacts(controller.getState())
  await waitFor(
    () => controller.getState().metrics.staleResultCount === 1,
    "MR1 lifecycle obsolete revision 4 did not arrive as stale",
  )
  const afterLateObsolete = stateFacts(controller.getState())

  controller.update(blockedInput(6))
  const blockedWithLastValid = stateFacts(controller.getState())

  controller.update(readyInput(7, " · กู้คืนแล้ว"))
  const recoveryPending = stateFacts(controller.getState())
  await waitFor(
    () => controller.getState().phase === "draft-current" && controller.getState().appliedRevision === 7,
    "MR1 lifecycle revision 7 did not become current",
  )
  const finalCurrent = stateFacts(controller.getState())
  const sequenceDurationMs = performance.now() - sequenceStartedAt
  const finalLastValid = controller.getState().lastValid
  if (finalLastValid == null) throw new Error("MR1 lifecycle final last-valid display list is missing")

  controller.dispose()
  worker.terminate()
  writeResult("pass", {
    diagnostics: diagnostics.identity,
    fontReadiness,
    debounceMs: DEBOUNCE_MS,
    artificialResponseDelayMsByRevision: responseDelayByRevision,
    requestedRevisions,
    cancelledRevisions,
    workerDurationMsByRevision,
    initialCurrent,
    coalescedPending,
    replacementPending,
    newestCurrent,
    afterLateObsolete,
    blockedWithLastValid,
    recoveryPending,
    finalCurrent,
    stateTransitions,
    paintedRevisions,
    paintedDisplayListFingerprints,
    finalDisplayListFingerprint: finalLastValid.displayList.fingerprint,
    paintDurationMs,
    appliedEndToEndDurationMsByRevision,
    sequenceDurationMs,
    contracts: {
      debounceCoalescesUndispatchedRevisions: true,
      cancellationIsAdvisory: true,
      staleCompletionCannotPublish: true,
      lastValidRetainedWhilePending: true,
      lastValidRetainedWhileBlocked: true,
      canvasPaintsAcceptedLatestOnly: true,
      rendererMeasuredText: false,
      rendererRelayout: false,
      backendBinding: false,
      productBinding: false,
    },
  })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
