import type {
  FlowDocTextEngineMultiRunLayoutInputV1,
  FlowDocTextEngineMultiRunLayoutResultV1,
} from "@flowdoc/text-engine-rust-wasm"
import {
  projectCoreLiveDraftMultiRunDisplayListV1,
  type CoreLiveDraftMultiRunDisplayListV1,
} from "../../core/coreAdapter"

export const FLOWDOC_LIVE_DRAFT_MULTI_RUN_DEBOUNCE_MS = 75

type AcceptedLayoutResult = Extract<FlowDocTextEngineMultiRunLayoutResultV1, { status: "accepted" }>

export interface FlowDocLiveDraftMultiRunReadyInputV1 {
  status: "ready"
  documentId: string
  documentRevision: number
  contentFingerprint: string
  projectionId: string
  origin: { xLayoutUnit: number; yLayoutUnit: number }
  layout: FlowDocTextEngineMultiRunLayoutInputV1
}

export interface FlowDocLiveDraftMultiRunBlockedInputV1 {
  status: "blocked"
  documentId: string
  documentRevision: number
  contentFingerprint: string
  reason: string
}

export type FlowDocLiveDraftMultiRunInputV1 =
  | FlowDocLiveDraftMultiRunReadyInputV1
  | FlowDocLiveDraftMultiRunBlockedInputV1

export interface FlowDocLiveDraftMultiRunCompletionV1 {
  requestId: string
  documentRevision: number
  contentFingerprint: string
  result: FlowDocTextEngineMultiRunLayoutResultV1
  workerDurationMs: number
}

export interface FlowDocLiveDraftMultiRunAppliedResultV1 {
  input: FlowDocLiveDraftMultiRunReadyInputV1
  requestId: string
  result: AcceptedLayoutResult
  displayList: CoreLiveDraftMultiRunDisplayListV1
  workerDurationMs: number
  endToEndDurationMs: number
}

export interface FlowDocLiveDraftMultiRunControllerStateV1 {
  phase: "idle" | "draft-updating" | "draft-current" | "draft-blocked"
  message: string
  pendingRevision: number | null
  appliedRevision: number | null
  lastValid: FlowDocLiveDraftMultiRunAppliedResultV1 | null
  metrics: {
    scheduledCount: number
    requestCount: number
    appliedCount: number
    staleResultCount: number
    cancellationCount: number
    blockedCount: number
  }
}

export interface FlowDocLiveDraftMultiRunControllerDependenciesV1 {
  layout(input: {
    requestId: string
    input: FlowDocLiveDraftMultiRunReadyInputV1
  }): Promise<FlowDocLiveDraftMultiRunCompletionV1>
  cancel(input: { requestId: string; documentRevision: number }): void
  now(): number
  setTimer(callback: () => void, delayMs: number): unknown
  clearTimer(timer: unknown): void
  onStateChange(state: FlowDocLiveDraftMultiRunControllerStateV1): void
}

export function createFlowDocLiveDraftMultiRunInitialStateV1(): FlowDocLiveDraftMultiRunControllerStateV1 {
  return {
    phase: "idle",
    message: "Live Draft is idle.",
    pendingRevision: null,
    appliedRevision: null,
    lastValid: null,
    metrics: {
      scheduledCount: 0,
      requestCount: 0,
      appliedCount: 0,
      staleResultCount: 0,
      cancellationCount: 0,
      blockedCount: 0,
    },
  }
}

export function createFlowDocLiveDraftMultiRunRequestIdV1(
  input: FlowDocLiveDraftMultiRunReadyInputV1,
): string {
  return `live-draft-multi-run:${input.documentId}:${input.documentRevision}:${input.contentFingerprint}`
}

function inputKey(input: FlowDocLiveDraftMultiRunInputV1): string {
  return [input.documentId, input.documentRevision, input.contentFingerprint].join("\u0000")
}

export function createFlowDocLiveDraftMultiRunControllerV1(options: {
  debounceMs?: number
  dependencies: FlowDocLiveDraftMultiRunControllerDependenciesV1
}): {
  update(input: FlowDocLiveDraftMultiRunInputV1): void
  dispose(): void
  getState(): FlowDocLiveDraftMultiRunControllerStateV1
} {
  const { dependencies } = options
  const debounceMs = options.debounceMs ?? FLOWDOC_LIVE_DRAFT_MULTI_RUN_DEBOUNCE_MS
  let state = createFlowDocLiveDraftMultiRunInitialStateV1()
  let timer: unknown = null
  let disposed = false
  let latestKey: string | null = null
  let active: { key: string; requestId: string; documentRevision: number } | null = null

  const publish = (next: FlowDocLiveDraftMultiRunControllerStateV1): void => {
    state = next
    dependencies.onStateChange(state)
  }
  const cancelPendingWork = (): void => {
    if (timer != null) {
      dependencies.clearTimer(timer)
      timer = null
    }
    if (active != null) {
      dependencies.cancel({
        requestId: active.requestId,
        documentRevision: active.documentRevision,
      })
      state = {
        ...state,
        metrics: { ...state.metrics, cancellationCount: state.metrics.cancellationCount + 1 },
      }
      active = null
    }
  }
  const retainStaleResult = (): void => {
    if (disposed) return
    publish({
      ...state,
      metrics: { ...state.metrics, staleResultCount: state.metrics.staleResultCount + 1 },
    })
  }
  const run = async (
    input: FlowDocLiveDraftMultiRunReadyInputV1,
    key: string,
    updateStartedAt: number,
  ): Promise<void> => {
    timer = null
    if (disposed || latestKey !== key) return
    const requestId = createFlowDocLiveDraftMultiRunRequestIdV1(input)
    active = { key, requestId, documentRevision: input.documentRevision }
    publish({
      ...state,
      metrics: { ...state.metrics, requestCount: state.metrics.requestCount + 1 },
    })
    try {
      const completion = await dependencies.layout({ requestId, input })
      const current = !disposed
        && latestKey === key
        && completion.requestId === requestId
        && completion.documentRevision === input.documentRevision
        && completion.contentFingerprint === input.contentFingerprint
      if (!current) {
        retainStaleResult()
        return
      }
      if (completion.result.status !== "accepted") {
        publish({
          ...state,
          phase: "draft-blocked",
          message: completion.result.issues.map((issue) => issue.message).join("\n"),
          pendingRevision: null,
          metrics: { ...state.metrics, blockedCount: state.metrics.blockedCount + 1 },
        })
        return
      }
      const displayList = projectCoreLiveDraftMultiRunDisplayListV1({
        projectionId: input.projectionId,
        layout: completion.result.layout,
        origin: input.origin,
      })
      const applied: FlowDocLiveDraftMultiRunAppliedResultV1 = {
        input,
        requestId,
        result: completion.result,
        displayList,
        workerDurationMs: completion.workerDurationMs,
        endToEndDurationMs: dependencies.now() - updateStartedAt,
      }
      publish({
        ...state,
        phase: "draft-current",
        message: `Draft current · ${displayList.summary.lineCount} lines`,
        pendingRevision: null,
        appliedRevision: input.documentRevision,
        lastValid: applied,
        metrics: { ...state.metrics, appliedCount: state.metrics.appliedCount + 1 },
      })
    } catch (error: unknown) {
      if (disposed) return
      if (latestKey !== key) {
        retainStaleResult()
        return
      }
      publish({
        ...state,
        phase: "draft-blocked",
        message: error instanceof Error ? error.message : String(error),
        pendingRevision: null,
        metrics: { ...state.metrics, blockedCount: state.metrics.blockedCount + 1 },
      })
    } finally {
      if (active?.key === key) active = null
    }
  }

  return {
    update(input) {
      if (disposed) return
      const key = inputKey(input)
      if (input.status === "blocked") {
        cancelPendingWork()
        latestKey = key
        publish({
          ...state,
          phase: "draft-blocked",
          message: input.reason,
          pendingRevision: null,
          metrics: { ...state.metrics, blockedCount: state.metrics.blockedCount + 1 },
        })
        return
      }
      if (latestKey === key && (
        state.pendingRevision === input.documentRevision || state.appliedRevision === input.documentRevision
      )) return
      cancelPendingWork()
      latestKey = key
      const updateStartedAt = dependencies.now()
      publish({
        ...state,
        phase: "draft-updating",
        message: state.lastValid == null ? "Preparing Live Draft…" : "Updating Live Draft…",
        pendingRevision: input.documentRevision,
        metrics: { ...state.metrics, scheduledCount: state.metrics.scheduledCount + 1 },
      })
      timer = dependencies.setTimer(() => { void run(input, key, updateStartedAt) }, debounceMs)
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelPendingWork()
    },
    getState() {
      return state
    },
  }
}
