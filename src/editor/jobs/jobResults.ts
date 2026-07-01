import type { EditorJobQueueState, EditorJobStatus, EditorJobTarget } from "./jobTypes"

export type CompletedEditorJobStatus = Extract<
  EditorJobStatus,
  "cancelled" | "completed" | "failed" | "stale"
>

export interface EditorJobResult {
  changed?: EditorJobTarget
  error?: string
  jobId: string
  producedDocumentId?: string
  producedRevision?: number
  status: CompletedEditorJobStatus
  summary: string
}

export function applyEditorJobResult(
  state: EditorJobQueueState,
  result: EditorJobResult,
): EditorJobQueueState {
  const jobIndex = state.jobs.findIndex((job) => job.id === result.jobId)
  if (jobIndex === -1) return state

  const jobs = state.jobs.map((job, index) => {
    if (index !== jobIndex) return job

    return {
      ...job,
      status: result.status,
    }
  })

  return {
    jobs,
    revision: state.revision + 1,
  }
}
