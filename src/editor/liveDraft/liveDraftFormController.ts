import type { FlowDocLiveDraftFormResultV1 } from "./liveDraftWorkerProtocol"
import type { FlowDocLiveDraftFormProjectionResultV1 } from "./liveDraftFormProjection"

export const FLOWDOC_LIVE_DRAFT_FORM_DEBOUNCE_MS = 75

type ReadyProjection = Extract<FlowDocLiveDraftFormProjectionResultV1, { status: "ready" }>

export interface FlowDocLiveDraftFormAppliedResultV1 {
  projection: ReadyProjection
  result: FlowDocLiveDraftFormResultV1
  endToEndDurationMs: number
}

export interface FlowDocLiveDraftFormControllerStateV1 {
  phase: "idle" | "draft-updating" | "draft-current" | "draft-blocked"
  message: string
  pendingRevision: number | null
  appliedRevision: number | null
  lastValid: FlowDocLiveDraftFormAppliedResultV1 | null
  metrics: {
    scheduledCount: number
    requestCount: number
    appliedCount: number
    staleResultCount: number
    cancellationCount: number
  }
}

export interface FlowDocLiveDraftFormControllerDependenciesV1 {
  layout(input: { projection: ReadyProjection; requestId: string }): Promise<FlowDocLiveDraftFormResultV1>
  cancel(input: { requestId: string; requestRevision: number }): void
  now(): number
  setTimer(callback: () => void, delayMs: number): unknown
  clearTimer(timer: unknown): void
  onStateChange(state: FlowDocLiveDraftFormControllerStateV1): void
}

export function createFlowDocLiveDraftFormInitialStateV1(): FlowDocLiveDraftFormControllerStateV1 {
  return {
    phase: "idle",
    message: "Enter the selected Form field to start Live Draft.",
    pendingRevision: null,
    appliedRevision: null,
    lastValid: null,
    metrics: {
      scheduledCount: 0,
      requestCount: 0,
      appliedCount: 0,
      staleResultCount: 0,
      cancellationCount: 0,
    },
  }
}

export function createFlowDocLiveDraftFormRequestIdV1(projection: ReadyProjection): string {
  return `live-draft-form:${projection.documentId}:${projection.formRevision}`
}

function projectionKey(projection: ReadyProjection): string {
  return [
    projection.documentId,
    projection.structureRevision,
    projection.formRevision,
    projection.draftSnapshotFingerprint,
    projection.canonicalFormCandidateFingerprint,
    projection.fieldKey,
  ].join("\u0000")
}

export function createFlowDocLiveDraftFormControllerV1(input: {
  debounceMs?: number
  dependencies: FlowDocLiveDraftFormControllerDependenciesV1
}): {
  update(projection: FlowDocLiveDraftFormProjectionResultV1): void
  dispose(): void
  getState(): FlowDocLiveDraftFormControllerStateV1
} {
  const { dependencies } = input
  const debounceMs = input.debounceMs ?? FLOWDOC_LIVE_DRAFT_FORM_DEBOUNCE_MS
  let state = createFlowDocLiveDraftFormInitialStateV1()
  let timer: unknown = null
  let disposed = false
  let latestKey: string | null = null
  let active: { key: string; requestId: string; requestRevision: number } | null = null
  let updateStartedAt = 0

  const publish = (next: FlowDocLiveDraftFormControllerStateV1): void => {
    state = next
    dependencies.onStateChange(state)
  }
  const cancelPendingWork = (): void => {
    if (timer != null) {
      dependencies.clearTimer(timer)
      timer = null
    }
    if (active != null) {
      dependencies.cancel({ requestId: active.requestId, requestRevision: active.requestRevision })
      state = {
        ...state,
        metrics: { ...state.metrics, cancellationCount: state.metrics.cancellationCount + 1 },
      }
      active = null
    }
  }
  const run = async (projection: ReadyProjection, key: string): Promise<void> => {
    timer = null
    if (disposed || latestKey !== key) return
    const requestId = createFlowDocLiveDraftFormRequestIdV1(projection)
    active = { key, requestId, requestRevision: projection.formRevision }
    publish({
      ...state,
      metrics: { ...state.metrics, requestCount: state.metrics.requestCount + 1 },
    })
    try {
      const result = await dependencies.layout({ projection, requestId })
      const current = !disposed
        && latestKey === key
        && result.identity.requestId === requestId
        && result.identity.requestRevision === projection.formRevision
        && result.identity.draftSnapshotFingerprint === projection.draftSnapshotFingerprint
        && result.identity.canonicalFormCandidateFingerprint === projection.canonicalFormCandidateFingerprint
      if (!current) {
        if (!disposed) publish({
          ...state,
          metrics: { ...state.metrics, staleResultCount: state.metrics.staleResultCount + 1 },
        })
        return
      }
      const applied: FlowDocLiveDraftFormAppliedResultV1 = {
        projection,
        result,
        endToEndDurationMs: dependencies.now() - updateStartedAt,
      }
      publish({
        ...state,
        phase: "draft-current",
        message: `Draft current · ${result.coreLayout.pagination.summary.pageCount} pages`,
        pendingRevision: null,
        appliedRevision: projection.formRevision,
        lastValid: applied,
        metrics: { ...state.metrics, appliedCount: state.metrics.appliedCount + 1 },
      })
    } catch (error: unknown) {
      if (disposed || latestKey !== key) return
      publish({
        ...state,
        phase: "draft-blocked",
        message: error instanceof Error ? error.message : String(error),
        pendingRevision: null,
      })
    } finally {
      if (active?.key === key) active = null
    }
  }

  return {
    update(projection) {
      if (disposed) return
      if (projection.status !== "ready") {
        cancelPendingWork()
        latestKey = null
        publish({
          ...state,
          phase: projection.status === "blocked" ? "draft-blocked" : "idle",
          message: projection.reason,
          pendingRevision: null,
        })
        return
      }
      const key = projectionKey(projection)
      if (latestKey === key && (
        state.pendingRevision === projection.formRevision || state.appliedRevision === projection.formRevision
      )) return
      cancelPendingWork()
      latestKey = key
      updateStartedAt = dependencies.now()
      publish({
        ...state,
        phase: "draft-updating",
        message: state.lastValid == null ? "Preparing Live Draft…" : "Updating Live Draft…",
        pendingRevision: projection.formRevision,
        metrics: { ...state.metrics, scheduledCount: state.metrics.scheduledCount + 1 },
      })
      timer = dependencies.setTimer(() => { void run(projection, key) }, debounceMs)
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
