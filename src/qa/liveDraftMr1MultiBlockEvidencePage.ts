import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL,
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_URL,
} from "@flowdoc/text-engine-rust-wasm/browser-assets-mr1"
import { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 } from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocLiveDraftMultiBlockControllerV1,
  type FlowDocLiveDraftMultiBlockControllerStateV1,
} from "../editor/liveDraft/liveDraftMultiBlockController"
import { paintFlowDocLiveDraftMultiBlockCanvasV1 } from "../editor/liveDraft/liveDraftMultiBlockCanvasPainter"
import { ensureFlowDocLiveDraftMr1CanvasFontsV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasFont"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"
import {
  createFlowDocLiveDraftMr1MultiBlockInputV1,
  FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID,
  FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_PAGE_GEOMETRY,
  type FlowDocLiveDraftMr1MultiBlockVariantV1,
} from "./liveDraftMr1MultiBlockFixture"
import type {
  FlowDocLiveDraftMr1MultiBlockWorkerRequestV1,
  FlowDocLiveDraftMr1MultiBlockWorkerResponseV1,
} from "./liveDraftMr1MultiBlockEvidence.worker"

function writeResult(status: "pass" | "fail", value: unknown): void {
  const target = document.querySelector<HTMLPreElement>("#flowdoc-live-draft-mr1-multi-block-result")
  if (target == null) throw new Error("MR1 multi-block result target is missing")
  target.dataset.status = status
  target.textContent = JSON.stringify(value)
}

function stateFacts(state: FlowDocLiveDraftMultiBlockControllerStateV1) {
  return {
    phase: state.phase,
    pendingRevision: state.pendingRevision,
    appliedRevision: state.appliedRevision,
    lastValidRevision: state.lastValid?.input.documentRevision ?? null,
    lastValidFingerprint: state.lastValid?.displayList.fingerprint ?? null,
    pageCount: state.lastValid?.displayList.summary.pageCount ?? null,
    lineCount: state.lastValid?.displayList.summary.lineCount ?? null,
    dirtyTextBlockIds: state.lastValid?.dirtyTextBlockIds ?? [],
    work: state.lastValid?.composition.work ?? null,
    projectionWork: state.lastValid?.displayList.work ?? null,
    compositionDurationMs: state.lastValid?.compositionDurationMs ?? null,
    projectionDurationMs: state.lastValid?.projectionDurationMs ?? null,
    endToEndDurationMs: state.lastValid?.endToEndDurationMs ?? null,
    metrics: structuredClone(state.metrics),
  }
}

async function waitFor(predicate: () => boolean, message: string, timeoutMs = 30_000): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error(message)
}

async function run(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#flowdoc-live-draft-mr1-multi-block-canvas")
  if (canvas == null) throw new Error("MR1 multi-block Canvas target is missing")
  const assetStartedAt = performance.now()
  const [wasmResponse, regularResponse, boldResponse] = await Promise.all([
    fetch(FLOWDOC_TEXT_ENGINE_MR1_WASM_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_REGULAR_URL),
    fetch(FLOWDOC_TEXT_ENGINE_MR1_SARABUN_BOLD_URL),
  ])
  if (!wasmResponse.ok || !regularResponse.ok || !boldResponse.ok) {
    throw new Error("failed to load pinned MR1 multi-block WASM/font bytes")
  }
  const [wasmBytes, regularBytes, boldBytes] = await Promise.all([
    wasmResponse.arrayBuffer(),
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ])
  const assetFetchDurationMs = performance.now() - assetStartedAt
  const fontStartedAt = performance.now()
  const fontReadiness = await ensureFlowDocLiveDraftMr1CanvasFontsV1({
    regularBytes: regularBytes.slice(0),
    boldBytes: boldBytes.slice(0),
  })
  const fontReadinessDurationMs = performance.now() - fontStartedAt
  const fontFixture = createFlowDocLiveDraftMr1MultiBlockInputV1({ documentRevision: 1, variant: "initial" })
  const [regularFace, boldFace] = fontFixture.blocks[5]!.layout.fontFaces
  if (regularFace == null || boldFace == null) throw new Error("MR1 multi-block font fixture is incomplete")

  const worker = new Worker(
    new URL("./liveDraftMr1MultiBlockEvidence.worker.ts", import.meta.url),
    { type: "module", name: "flowdoc-live-draft-mr1-multi-block-evidence" },
  )
  const pending = new Map<string, {
    resolve(value: Extract<FlowDocLiveDraftMr1MultiBlockWorkerResponseV1, {
      type: "live-draft-mr1-multi-block.result"
    }>): void
    reject(error: Error): void
  }>()
  let initializeResolve!: (value: Extract<FlowDocLiveDraftMr1MultiBlockWorkerResponseV1, {
    type: "live-draft-mr1-multi-block.initialized"
  }>) => void
  let initializeReject!: (error: Error) => void
  const initialized = new Promise<Extract<FlowDocLiveDraftMr1MultiBlockWorkerResponseV1, {
    type: "live-draft-mr1-multi-block.initialized"
  }>>((resolve, reject) => {
    initializeResolve = resolve
    initializeReject = reject
  })
  worker.onmessage = (event: MessageEvent<FlowDocLiveDraftMr1MultiBlockWorkerResponseV1>) => {
    const response = event.data
    if (response.type === "live-draft-mr1-multi-block.initialized") {
      initializeResolve(response)
      return
    }
    if (response.type === "live-draft-mr1-multi-block.blocked") {
      const error = new Error(response.message)
      if (response.requestId == null) initializeReject(error)
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
    initializeReject(error)
    pending.forEach((waiter) => waiter.reject(error))
    pending.clear()
  }
  const initializeRequest: FlowDocLiveDraftMr1MultiBlockWorkerRequestV1 = {
    type: "live-draft-mr1-multi-block.initialize",
    measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
    wasmBytes,
    fonts: [{ face: regularFace, bytes: regularBytes }, { face: boldFace, bytes: boldBytes }],
  }
  const initializationStartedAt = performance.now()
  worker.postMessage(initializeRequest, [wasmBytes, regularBytes, boldBytes])
  const diagnostics = await initialized
  const initializationDurationMs = performance.now() - initializationStartedAt

  const requested: Array<{ textBlockId: string; revision: number }> = []
  const workerDurationMs: number[] = []
  const paintDurationMs: number[] = []
  const paintedRevisions: number[] = []
  const paintedPageCounts: number[] = []
  const paintedFingerprints: string[] = []
  const appliedFacts: Record<string, ReturnType<typeof stateFacts>> = {}
  const warmMainThreadDurationMs: number[] = []
  const warmEndToEndDurationMs: number[] = []
  const warmCompositionDurationMs: number[] = []
  const warmProjectionDurationMs: number[] = []
  const warmPaintDurationMs: number[] = []
  let paintedFingerprint: string | null = null
  const responseDelayByRevision: Record<number, number> = { 4: 120 }

  const controller = createFlowDocLiveDraftMultiBlockControllerV1({
    layout(job) {
      requested.push({ textBlockId: job.textBlockId, revision: job.documentRevision })
      const response = new Promise<Extract<FlowDocLiveDraftMr1MultiBlockWorkerResponseV1, {
        type: "live-draft-mr1-multi-block.result"
      }>>((resolve, reject) => pending.set(job.payload.requestId, { resolve, reject }))
      const { fontFaces: _fontFaces, ...layout } = job.payload.layout
      const request: FlowDocLiveDraftMr1MultiBlockWorkerRequestV1 = {
        type: "live-draft-mr1-multi-block.layout",
        requestId: job.payload.requestId,
        textBlockId: job.textBlockId,
        contentFingerprint: job.contentFingerprint,
        responseDelayMs: job.textBlockId === FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID
          ? responseDelayByRevision[job.documentRevision] ?? 0
          : 0,
        layout,
      }
      worker.postMessage(request)
      return response.then((completion) => {
        workerDurationMs.push(completion.workerDurationMs)
        return completion
      })
    },
    now: () => performance.now(),
    queueMicrotask: (callback) => queueMicrotask(callback),
    onStateChange(state) {
      const lastValid = state.lastValid
      if (lastValid != null && lastValid.displayList.fingerprint !== paintedFingerprint) {
        const paint = paintFlowDocLiveDraftMultiBlockCanvasV1({
          canvas,
          displayList: lastValid.displayList,
          pageGeometry: lastValid.input.pageGeometry,
        })
        paintedFingerprint = lastValid.displayList.fingerprint
        paintDurationMs.push(paint.paintDurationMs)
        paintedRevisions.push(lastValid.input.documentRevision)
        paintedPageCounts.push(lastValid.displayList.summary.pageCount)
        paintedFingerprints.push(lastValid.displayList.fingerprint)
        canvas.dataset.paintStatus = "painted"
        canvas.dataset.displayListFingerprint = lastValid.displayList.fingerprint
        canvas.dataset.pageCount = String(lastValid.displayList.summary.pageCount)
      }
    },
  })

  const apply = async (revision: number, variant: FlowDocLiveDraftMr1MultiBlockVariantV1): Promise<void> => {
    controller.update(createFlowDocLiveDraftMr1MultiBlockInputV1({ documentRevision: revision, variant }))
    await waitFor(
      () => controller.getState().phase === "draft-current" && controller.getState().appliedRevision === revision,
      `MR1 multi-block revision ${revision} did not become current`,
    )
    appliedFacts[String(revision)] = stateFacts(controller.getState())
  }

  await apply(1, "initial")
  const initialRequestOrder = requested.map((entry) => entry.textBlockId)
  await apply(2, "expanded")
  await apply(3, "initial")

  controller.update(createFlowDocLiveDraftMr1MultiBlockInputV1({ documentRevision: 4, variant: "expanded" }))
  await waitFor(
    () => requested.some((entry) => entry.revision === 4 && entry.textBlockId === FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID),
    "MR1 multi-block delayed revision 4 was not dispatched",
  )
  const pendingRetains = stateFacts(controller.getState())
  controller.update(createFlowDocLiveDraftMr1MultiBlockInputV1({ documentRevision: 5, variant: "short-change" }))
  controller.update(createFlowDocLiveDraftMr1MultiBlockInputV1({ documentRevision: 6, variant: "expanded" }))
  const replacementRetains = stateFacts(controller.getState())
  await waitFor(
    () => controller.getState().phase === "draft-current" && controller.getState().appliedRevision === 6,
    "MR1 multi-block latest revision 6 did not become current",
  )
  await waitFor(() => controller.getState().metrics.staleResultCount >= 1, "MR1 multi-block stale result was not recorded")
  appliedFacts["6"] = stateFacts(controller.getState())

  controller.update({
    status: "blocked",
    documentId: "live-draft-mr1-multi-block-document",
    documentRevision: 7,
    contentFingerprint: "document:blocked:r7",
    reason: "Latest multi-block revision is intentionally blocked by QA validation.",
  })
  const blockedRetains = stateFacts(controller.getState())
  await apply(8, "initial")
  await apply(9, "short-change")

  const warmVariants: FlowDocLiveDraftMr1MultiBlockVariantV1[] = [
    "initial", "short-change", "initial", "short-change", "initial",
    "short-change", "initial", "short-change", "initial", "short-change",
  ]
  for (let index = 0; index < warmVariants.length; index += 1) {
    const revision = 10 + index
    await apply(revision, warmVariants[index]!)
    const lastValid = controller.getState().lastValid!
    warmMainThreadDurationMs.push(
      lastValid.compositionDurationMs + lastValid.projectionDurationMs + paintDurationMs.at(-1)!,
    )
    warmCompositionDurationMs.push(lastValid.compositionDurationMs)
    warmProjectionDurationMs.push(lastValid.projectionDurationMs)
    warmPaintDurationMs.push(paintDurationMs.at(-1)!)
    warmEndToEndDurationMs.push(lastValid.endToEndDurationMs)
  }
  const finalState = stateFacts(controller.getState())
  const finalLastValid = controller.getState().lastValid
  if (finalLastValid == null) throw new Error("MR1 multi-block final last-valid snapshot is missing")
  controller.dispose()
  worker.terminate()

  writeResult("pass", {
    diagnostics: diagnostics.identity,
    fontReadiness,
    assetFetchDurationMs,
    fontReadinessDurationMs,
    initializationDurationMs,
    textBlockCount: 12,
    activeTextBlockId: FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID,
    pageGeometry: FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_PAGE_GEOMETRY,
    initialRequestOrder,
    requested,
    initial: appliedFacts["1"],
    expanded: appliedFacts["2"],
    contracted: appliedFacts["3"],
    pendingRetains,
    replacementRetains,
    latestAfterStale: appliedFacts["6"],
    blockedRetains,
    recovered: appliedFacts["8"],
    sameGeometryChange: appliedFacts["9"],
    finalState,
    paintedRevisions,
    paintedPageCounts,
    paintedFingerprints,
    workerDurationMs,
    paintDurationMs,
    warmMainThreadDurationMs,
    warmEndToEndDurationMs,
    warmCompositionDurationMs,
    warmProjectionDurationMs,
    warmPaintDurationMs,
    finalDisplayListFingerprint: finalLastValid.displayList.fingerprint,
    contracts: {
      initializedWorkerReused: true,
      activeAndVisibleFirst: initialRequestOrder[0] === FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID,
      latestQueuedRevisionWins: !requested.some((entry) => entry.revision === 5),
      staleCompletionCannotPublish: !paintedRevisions.includes(4),
      lastValidRetainedWhilePending: pendingRetains.lastValidRevision === 3,
      lastValidRetainedWhileBlocked: blockedRetains.lastValidRevision === 6,
      coreOwnsPagination: true,
      canvasAtomicSwap: true,
      rendererMeasuredText: false,
      rendererRelayout: false,
      rendererPaginated: false,
      backendBinding: false,
      productBinding: false,
      tableScope: false,
    },
  })
}

run().catch((error: unknown) => writeResult("fail", {
  message: error instanceof Error ? error.message : String(error),
}))
