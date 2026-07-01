import type { EditorJob, EditorJobQueueState, EditorJobStatus } from "./jobTypes"

export interface EditorJobCounts {
  active: number
  cancelled: number
  completed: number
  failed: number
  queued: number
  running: number
  stale: number
  total: number
}

function isActiveJobStatus(status: EditorJobStatus): boolean {
  return status === "queued" || status === "running"
}

export function getActiveJobs(state: EditorJobQueueState): EditorJob[] {
  return state.jobs.filter((job) => isActiveJobStatus(job.status))
}

export function getJobCounts(state: EditorJobQueueState): EditorJobCounts {
  return state.jobs.reduce<EditorJobCounts>(
    (counts, job) => ({
      ...counts,
      active: counts.active + (isActiveJobStatus(job.status) ? 1 : 0),
      [job.status]: counts[job.status] + 1,
      total: counts.total + 1,
    }),
    {
      active: 0,
      cancelled: 0,
      completed: 0,
      failed: 0,
      queued: 0,
      running: 0,
      stale: 0,
      total: 0,
    },
  )
}
