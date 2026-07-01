import type { EditorJob, EditorJobQueueState, EditorJobRequest } from "./jobTypes"

const ACTIVE_JOB_STATUSES = new Set<EditorJob["status"]>(["queued", "running"])

export interface EditorJobEnqueueResult {
  deduped: boolean
  job: EditorJob
  state: EditorJobQueueState
}

function createJobId(revision: number, kind: EditorJobRequest["kind"]): string {
  return `job-${revision}-${kind.replace(".", "-")}`
}

export function createJobQueueState(jobs: EditorJob[] = []): EditorJobQueueState {
  return {
    jobs,
    revision: jobs.length,
  }
}

export function enqueueEditorJob(
  state: EditorJobQueueState,
  request: EditorJobRequest,
  createdAt = Date.now(),
): EditorJobEnqueueResult {
  const activeJob = state.jobs.find(
    (job) => job.dedupeKey === request.dedupeKey && ACTIVE_JOB_STATUSES.has(job.status),
  )

  if (activeJob) {
    return {
      deduped: true,
      job: activeJob,
      state,
    }
  }

  const revision = state.revision + 1
  const job: EditorJob = {
    ...request,
    createdAt,
    id: createJobId(revision, request.kind),
    status: "queued",
  }

  return {
    deduped: false,
    job,
    state: {
      jobs: [...state.jobs, job],
      revision,
    },
  }
}
