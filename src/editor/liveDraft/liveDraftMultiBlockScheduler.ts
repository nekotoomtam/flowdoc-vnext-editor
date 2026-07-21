import type { FlowDocLiveDraftTextBlockTokenImpactV1 } from "./liveDraftMultiBlockImpact"

export type FlowDocLiveDraftBlockVisibilityV1 = "active" | "visible" | "near-viewport" | "offscreen"

export interface FlowDocLiveDraftMultiBlockScheduleContextV1 {
  visibility: FlowDocLiveDraftBlockVisibilityV1
  nearLineEdge: boolean
  nearPageEdge: boolean
}

export interface FlowDocLiveDraftMultiBlockJobV1<Payload> {
  textBlockId: string
  documentRevision: number
  contentFingerprint: string
  impact: FlowDocLiveDraftTextBlockTokenImpactV1
  context: FlowDocLiveDraftMultiBlockScheduleContextV1
  payload: Payload
}

export interface FlowDocLiveDraftMultiBlockSchedulerMetricsV1 {
  scheduledCount: number
  startedCount: number
  appliedCount: number
  staleResultCount: number
  coalescedCount: number
  failedCount: number
}

export interface FlowDocLiveDraftMultiBlockSchedulerStateV1<Payload> {
  active: FlowDocLiveDraftMultiBlockJobV1<Payload> | null
  queued: FlowDocLiveDraftMultiBlockJobV1<Payload>[]
  metrics: FlowDocLiveDraftMultiBlockSchedulerMetricsV1
}

export interface FlowDocLiveDraftMultiBlockSchedulerDependenciesV1<Payload, Result> {
  execute(job: FlowDocLiveDraftMultiBlockJobV1<Payload>): Promise<Result>
  cancel?(job: FlowDocLiveDraftMultiBlockJobV1<Payload>): void
  queueMicrotask(callback: () => void): void
  onResult(event:
    | { status: "applied"; job: FlowDocLiveDraftMultiBlockJobV1<Payload>; result: Result }
    | { status: "stale"; job: FlowDocLiveDraftMultiBlockJobV1<Payload>; result?: Result }
    | { status: "failed"; job: FlowDocLiveDraftMultiBlockJobV1<Payload>; error: unknown }
  ): void
  onStateChange?(state: FlowDocLiveDraftMultiBlockSchedulerStateV1<Payload>): void
}

interface QueuedJob<Payload> {
  sequence: number
  job: FlowDocLiveDraftMultiBlockJobV1<Payload>
}

function jobKey<Payload>(job: FlowDocLiveDraftMultiBlockJobV1<Payload>): string {
  return `${job.documentRevision}\u0000${job.contentFingerprint}`
}

export function rankFlowDocLiveDraftMultiBlockJobV1<Payload>(
  job: FlowDocLiveDraftMultiBlockJobV1<Payload>,
): number {
  const edge = job.context.nearLineEdge || job.context.nearPageEdge
  const base = job.context.visibility === "active"
    ? edge ? 0 : 1
    : job.context.visibility === "visible"
      ? edge ? 2 : 3
      : job.context.visibility === "near-viewport" ? 5 : 7
  return job.impact.change === "structural" || job.impact.completedTokenBoundary
    ? Math.max(0, base - 1)
    : base
}

export function createFlowDocLiveDraftMultiBlockSchedulerV1<Payload, Result>(
  dependencies: FlowDocLiveDraftMultiBlockSchedulerDependenciesV1<Payload, Result>,
): {
  schedule(job: FlowDocLiveDraftMultiBlockJobV1<Payload>): void
  dispose(): void
  getState(): FlowDocLiveDraftMultiBlockSchedulerStateV1<Payload>
} {
  const queued = new Map<string, QueuedJob<Payload>>()
  const latestKeyByBlock = new Map<string, string>()
  let active: FlowDocLiveDraftMultiBlockJobV1<Payload> | null = null
  let sequence = 0
  let drainScheduled = false
  let disposed = false
  let metrics: FlowDocLiveDraftMultiBlockSchedulerMetricsV1 = {
    scheduledCount: 0,
    startedCount: 0,
    appliedCount: 0,
    staleResultCount: 0,
    coalescedCount: 0,
    failedCount: 0,
  }

  const snapshot = (): FlowDocLiveDraftMultiBlockSchedulerStateV1<Payload> => ({
    active,
    queued: [...queued.values()]
      .sort((left, right) => rankFlowDocLiveDraftMultiBlockJobV1(left.job) - rankFlowDocLiveDraftMultiBlockJobV1(right.job)
        || left.sequence - right.sequence)
      .map((entry) => entry.job),
    metrics: { ...metrics },
  })
  const publish = (): void => dependencies.onStateChange?.(snapshot())

  const scheduleDrain = (): void => {
    if (disposed || drainScheduled || active != null || queued.size === 0) return
    drainScheduled = true
    dependencies.queueMicrotask(() => {
      drainScheduled = false
      if (disposed || active != null) return
      const next = [...queued.values()].sort((left, right) => (
        rankFlowDocLiveDraftMultiBlockJobV1(left.job) - rankFlowDocLiveDraftMultiBlockJobV1(right.job)
        || left.sequence - right.sequence
      ))[0]
      if (next == null) return
      queued.delete(next.job.textBlockId)
      active = next.job
      metrics = { ...metrics, startedCount: metrics.startedCount + 1 }
      publish()
      void dependencies.execute(next.job).then((result) => {
        if (disposed) return
        if (latestKeyByBlock.get(next.job.textBlockId) !== jobKey(next.job)) {
          metrics = { ...metrics, staleResultCount: metrics.staleResultCount + 1 }
          dependencies.onResult({ status: "stale", job: next.job, result })
        } else {
          metrics = { ...metrics, appliedCount: metrics.appliedCount + 1 }
          dependencies.onResult({ status: "applied", job: next.job, result })
        }
      }).catch((error: unknown) => {
        if (disposed) return
        if (latestKeyByBlock.get(next.job.textBlockId) !== jobKey(next.job)) {
          metrics = { ...metrics, staleResultCount: metrics.staleResultCount + 1 }
          dependencies.onResult({ status: "stale", job: next.job })
        } else {
          metrics = { ...metrics, failedCount: metrics.failedCount + 1 }
          dependencies.onResult({ status: "failed", job: next.job, error })
        }
      }).finally(() => {
        if (disposed) return
        if (active === next.job) active = null
        publish()
        scheduleDrain()
      })
    })
  }

  return {
    schedule(job) {
      if (disposed) return
      const key = jobKey(job)
      if (latestKeyByBlock.get(job.textBlockId) === key) return
      latestKeyByBlock.set(job.textBlockId, key)
      const replaced = queued.has(job.textBlockId)
      queued.set(job.textBlockId, { sequence: sequence++, job })
      metrics = {
        ...metrics,
        scheduledCount: metrics.scheduledCount + 1,
        coalescedCount: metrics.coalescedCount + (replaced ? 1 : 0),
      }
      publish()
      scheduleDrain()
    },
    dispose() {
      if (disposed) return
      disposed = true
      queued.clear()
      if (active != null) dependencies.cancel?.(active)
      active = null
      publish()
    },
    getState: snapshot,
  }
}
