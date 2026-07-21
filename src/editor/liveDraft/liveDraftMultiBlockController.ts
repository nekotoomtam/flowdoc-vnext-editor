import type {
  FlowDocTextEngineMultiRunLayoutInputV1,
  FlowDocTextEngineMultiRunLayoutResultV1,
} from "@flowdoc/text-engine-rust-wasm"
import {
  composeCoreLiveDraftMultiBlockDocumentV1,
  projectCoreLiveDraftMultiBlockDisplayListV1,
  type CoreLiveDraftMultiBlockCompositionV1,
  type CoreLiveDraftMultiBlockDisplayListV1,
  type CoreLiveDraftMultiBlockPageGeometryV1,
  type CoreLiveDraftMultiRunAcceptedLayoutV1,
} from "../../core/coreAdapter"
import {
  analyzeFlowDocLiveDraftTextBlockTokenImpactV1,
  tokenizeFlowDocLiveDraftTextBlockV1,
  type FlowDocLiveDraftTextBlockTokenImpactV1,
} from "./liveDraftMultiBlockImpact"
import {
  createFlowDocLiveDraftMultiBlockSchedulerV1,
  type FlowDocLiveDraftBlockVisibilityV1,
  type FlowDocLiveDraftMultiBlockJobV1,
  type FlowDocLiveDraftMultiBlockSchedulerMetricsV1,
} from "./liveDraftMultiBlockScheduler"

type AcceptedEngineResult = Extract<FlowDocTextEngineMultiRunLayoutResultV1, { status: "accepted" }>

export interface FlowDocLiveDraftMultiBlockInputBlockV1 {
  textBlockId: string
  contentFingerprint: string
  layout: FlowDocTextEngineMultiRunLayoutInputV1
  visibility: FlowDocLiveDraftBlockVisibilityV1
  nearLineEdge: boolean
  nearPageEdge: boolean
}

export interface FlowDocLiveDraftMultiBlockReadyInputV1 {
  status: "ready"
  documentId: string
  documentRevision: number
  contentFingerprint: string
  compositionId: string
  projectionId: string
  pageGeometry: CoreLiveDraftMultiBlockPageGeometryV1
  blockGapLayoutUnit: number
  blocks: FlowDocLiveDraftMultiBlockInputBlockV1[]
}

export interface FlowDocLiveDraftMultiBlockBlockedInputV1 {
  status: "blocked"
  documentId: string
  documentRevision: number
  contentFingerprint: string
  reason: string
}

export type FlowDocLiveDraftMultiBlockInputV1 =
  | FlowDocLiveDraftMultiBlockReadyInputV1
  | FlowDocLiveDraftMultiBlockBlockedInputV1

export interface FlowDocLiveDraftMultiBlockLayoutTaskV1 {
  requestId: string
  layout: FlowDocTextEngineMultiRunLayoutInputV1
}

export interface FlowDocLiveDraftMultiBlockLayoutCompletionV1 {
  requestId: string
  textBlockId: string
  contentFingerprint: string
  workerDurationMs: number
  result: FlowDocTextEngineMultiRunLayoutResultV1
}

export interface FlowDocLiveDraftMultiBlockAppliedResultV1 {
  input: FlowDocLiveDraftMultiBlockReadyInputV1
  layouts: Record<string, AcceptedEngineResult>
  composition: CoreLiveDraftMultiBlockCompositionV1
  displayList: CoreLiveDraftMultiBlockDisplayListV1
  dirtyTextBlockIds: string[]
  workerDurationMsByTextBlock: Record<string, number>
  compositionDurationMs: number
  projectionDurationMs: number
  endToEndDurationMs: number
}

export interface FlowDocLiveDraftMultiBlockControllerStateV1 {
  phase: "idle" | "draft-updating" | "draft-current" | "draft-blocked"
  message: string
  pendingRevision: number | null
  appliedRevision: number | null
  lastValid: FlowDocLiveDraftMultiBlockAppliedResultV1 | null
  metrics: FlowDocLiveDraftMultiBlockSchedulerMetricsV1 & {
    compositionCount: number
    projectionCount: number
    blockedCount: number
  }
}

export interface FlowDocLiveDraftMultiBlockControllerDependenciesV1 {
  layout(job: FlowDocLiveDraftMultiBlockJobV1<FlowDocLiveDraftMultiBlockLayoutTaskV1>):
    Promise<FlowDocLiveDraftMultiBlockLayoutCompletionV1>
  cancel?(job: FlowDocLiveDraftMultiBlockJobV1<FlowDocLiveDraftMultiBlockLayoutTaskV1>): void
  now(): number
  queueMicrotask(callback: () => void): void
  onStateChange(state: FlowDocLiveDraftMultiBlockControllerStateV1): void
}

const EMPTY_SCHEDULER_METRICS: FlowDocLiveDraftMultiBlockSchedulerMetricsV1 = {
  scheduledCount: 0,
  startedCount: 0,
  appliedCount: 0,
  staleResultCount: 0,
  coalescedCount: 0,
  failedCount: 0,
}

export function createFlowDocLiveDraftMultiBlockInitialStateV1(): FlowDocLiveDraftMultiBlockControllerStateV1 {
  return {
    phase: "idle",
    message: "Multi-block Live Draft is idle.",
    pendingRevision: null,
    appliedRevision: null,
    lastValid: null,
    metrics: {
      ...EMPTY_SCHEDULER_METRICS,
      compositionCount: 0,
      projectionCount: 0,
      blockedCount: 0,
    },
  }
}

function initialImpact(block: FlowDocLiveDraftMultiBlockInputBlockV1): FlowDocLiveDraftTextBlockTokenImpactV1 {
  const tokens = tokenizeFlowDocLiveDraftTextBlockV1(block.layout)
  return {
    textBlockId: block.textBlockId,
    change: "structural",
    previousTokenCount: 0,
    currentTokenCount: tokens.length,
    commonPrefixTokenCount: 0,
    commonSuffixTokenCount: 0,
    previousDirtyTokenRange: { startIndex: 0, endIndex: 0 },
    currentDirtyTokenRange: { startIndex: 0, endIndex: tokens.length },
    currentDirtyRenderRange: { startOffset: 0, endOffset: block.layout.measurement.renderedText.length },
    dirtyTokenIds: tokens.map((token) => token.id),
    completedTokenBoundary: true,
    recommendedDispatch: "immediate",
    contracts: {
      purpose: "scheduling-and-invalidation-hint",
      lineBreakAuthority: false,
      geometryAuthority: false,
      exactLayoutStillRequired: true,
    },
  }
}

function inputKey(input: FlowDocLiveDraftMultiBlockInputV1): string {
  return `${input.documentId}\u0000${input.documentRevision}\u0000${input.contentFingerprint}`
}

function requestId(input: FlowDocLiveDraftMultiBlockReadyInputV1, block: FlowDocLiveDraftMultiBlockInputBlockV1): string {
  return `live-draft-multi-block:${input.documentId}:${input.documentRevision}:${block.textBlockId}:${block.contentFingerprint}`
}

export function createFlowDocLiveDraftMultiBlockControllerV1(
  dependencies: FlowDocLiveDraftMultiBlockControllerDependenciesV1,
): {
  update(input: FlowDocLiveDraftMultiBlockInputV1): void
  dispose(): void
  getState(): FlowDocLiveDraftMultiBlockControllerStateV1
} {
  let state = createFlowDocLiveDraftMultiBlockInitialStateV1()
  let latestInput: FlowDocLiveDraftMultiBlockReadyInputV1 | null = null
  let latestInputKey: string | null = null
  let updateStartedAt = 0
  let disposed = false
  let acceptedLayouts = new Map<string, AcceptedEngineResult>()
  let acceptedContentFingerprints = new Map<string, string>()
  let workerDurationMsByTextBlock: Record<string, number> = {}
  let compositionCount = 0
  let projectionCount = 0
  let blockedCount = 0

  const publish = (next: Omit<FlowDocLiveDraftMultiBlockControllerStateV1, "metrics">): void => {
    const schedulerMetrics = scheduler.getState().metrics
    state = {
      ...next,
      metrics: {
        ...schedulerMetrics,
        compositionCount,
        projectionCount,
        blockedCount,
      },
    }
    dependencies.onStateChange(state)
  }

  const tryComposeLatest = (): void => {
    const input = latestInput
    if (disposed || input == null) return
    const orderedResults = input.blocks.map((block) => acceptedLayouts.get(block.textBlockId))
    if (orderedResults.some((result) => result == null)) return
    if (input.blocks.some((block) => acceptedContentFingerprints.get(block.textBlockId) !== block.contentFingerprint)) return
    const engineResults = orderedResults as AcceptedEngineResult[]
    const layouts = engineResults.map((result) => result.layout)
    const previous = state.lastValid?.composition
    const previousFingerprintByBlock = new Map(previous?.blocks.map((block) => [block.textBlockId, block.layoutFingerprint]))
    const dirtyTextBlockIds = input.blocks
      .filter((block, index) => previousFingerprintByBlock.get(block.textBlockId) !== layouts[index]!.fingerprint)
      .map((block) => block.textBlockId)
    const compositionStartedAt = dependencies.now()
    try {
      const composition = composeCoreLiveDraftMultiBlockDocumentV1({
        compositionId: input.compositionId,
        documentId: input.documentId,
        documentRevision: input.documentRevision,
        pageGeometry: input.pageGeometry,
        blockGapLayoutUnit: input.blockGapLayoutUnit,
        blocks: input.blocks.map((block, index) => ({ textBlockId: block.textBlockId, layout: layouts[index]! })),
        dirtyTextBlockIds,
        ...(previous == null ? {} : { previousComposition: previous }),
      })
      const compositionDurationMs = dependencies.now() - compositionStartedAt
      compositionCount += 1
      const projectionStartedAt = dependencies.now()
      const displayList = projectCoreLiveDraftMultiBlockDisplayListV1({
        projectionId: input.projectionId,
        composition,
        layouts,
        ...(state.lastValid == null ? {} : { previousDisplayList: state.lastValid.displayList }),
      })
      const projectionDurationMs = dependencies.now() - projectionStartedAt
      projectionCount += 1
      const layoutRecord = Object.fromEntries(input.blocks.map((block, index) => [block.textBlockId, engineResults[index]!]))
      const applied: FlowDocLiveDraftMultiBlockAppliedResultV1 = {
        input,
        layouts: layoutRecord,
        composition,
        displayList,
        dirtyTextBlockIds,
        workerDurationMsByTextBlock: { ...workerDurationMsByTextBlock },
        compositionDurationMs,
        projectionDurationMs,
        endToEndDurationMs: dependencies.now() - updateStartedAt,
      }
      publish({
        phase: "draft-current",
        message: `Draft current · ${displayList.summary.pageCount} pages · ${displayList.summary.lineCount} lines`,
        pendingRevision: null,
        appliedRevision: input.documentRevision,
        lastValid: applied,
      })
    } catch (error: unknown) {
      blockedCount += 1
      publish({
        phase: "draft-blocked",
        message: error instanceof Error ? error.message : String(error),
        pendingRevision: null,
        appliedRevision: state.appliedRevision,
        lastValid: state.lastValid,
      })
    }
  }

  const scheduler = createFlowDocLiveDraftMultiBlockSchedulerV1<
    FlowDocLiveDraftMultiBlockLayoutTaskV1,
    FlowDocLiveDraftMultiBlockLayoutCompletionV1
  >({
    execute: dependencies.layout,
    cancel: dependencies.cancel,
    queueMicrotask: dependencies.queueMicrotask,
    onResult(event) {
      if (disposed) return
      if (event.status === "failed") {
        blockedCount += 1
        publish({
          phase: "draft-blocked",
          message: event.error instanceof Error ? event.error.message : String(event.error),
          pendingRevision: null,
          appliedRevision: state.appliedRevision,
          lastValid: state.lastValid,
        })
        return
      }
      if (event.status === "stale") {
        publish({ ...state })
        return
      }
      const completion = event.result
      const input = latestInput
      const currentBlock = input?.blocks.find((block) => block.textBlockId === event.job.textBlockId)
      if (
        input == null
        || currentBlock == null
        || currentBlock.contentFingerprint !== event.job.contentFingerprint
        || completion.requestId !== event.job.payload.requestId
        || completion.textBlockId !== event.job.textBlockId
        || completion.contentFingerprint !== event.job.contentFingerprint
      ) {
        publish({ ...state })
        return
      }
      if (completion.result.status !== "accepted") {
        blockedCount += 1
        publish({
          phase: "draft-blocked",
          message: completion.result.issues.map((candidate) => candidate.message).join("\n"),
          pendingRevision: null,
          appliedRevision: state.appliedRevision,
          lastValid: state.lastValid,
        })
        return
      }
      acceptedLayouts.set(event.job.textBlockId, completion.result)
      acceptedContentFingerprints.set(event.job.textBlockId, event.job.contentFingerprint)
      workerDurationMsByTextBlock[event.job.textBlockId] = completion.workerDurationMs
      tryComposeLatest()
    },
  })

  return {
    update(input) {
      if (disposed) return
      const key = inputKey(input)
      if (key === latestInputKey) return
      latestInputKey = key
      if (input.status === "blocked") {
        latestInput = null
        blockedCount += 1
        publish({
          phase: "draft-blocked",
          message: input.reason,
          pendingRevision: null,
          appliedRevision: state.appliedRevision,
          lastValid: state.lastValid,
        })
        return
      }
      updateStartedAt = dependencies.now()
      const previousInput = latestInput ?? state.lastValid?.input ?? null
      latestInput = input
      const currentIds = new Set(input.blocks.map((block) => block.textBlockId))
      acceptedLayouts = new Map([...acceptedLayouts].filter(([textBlockId]) => currentIds.has(textBlockId)))
      acceptedContentFingerprints = new Map(
        [...acceptedContentFingerprints].filter(([textBlockId]) => currentIds.has(textBlockId)),
      )
      workerDurationMsByTextBlock = Object.fromEntries(
        Object.entries(workerDurationMsByTextBlock).filter(([textBlockId]) => currentIds.has(textBlockId)),
      )
      publish({
        phase: "draft-updating",
        message: state.lastValid == null ? "Preparing multi-block Live Draft…" : "Updating multi-block Live Draft…",
        pendingRevision: input.documentRevision,
        appliedRevision: state.appliedRevision,
        lastValid: state.lastValid,
      })

      input.blocks.forEach((block) => {
        if (acceptedContentFingerprints.get(block.textBlockId) === block.contentFingerprint) return
        const previousBlock = previousInput?.blocks.find((candidate) => candidate.textBlockId === block.textBlockId)
        const impact = previousBlock == null
          ? initialImpact(block)
          : analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous: previousBlock.layout, current: block.layout })
        const task: FlowDocLiveDraftMultiBlockLayoutTaskV1 = {
          requestId: requestId(input, block),
          layout: block.layout,
        }
        scheduler.schedule({
          textBlockId: block.textBlockId,
          documentRevision: input.documentRevision,
          contentFingerprint: block.contentFingerprint,
          impact,
          context: {
            visibility: block.visibility,
            nearLineEdge: block.nearLineEdge,
            nearPageEdge: block.nearPageEdge,
          },
          payload: task,
        })
      })
      tryComposeLatest()
    },
    dispose() {
      if (disposed) return
      disposed = true
      scheduler.dispose()
    },
    getState() {
      return state
    },
  }
}
