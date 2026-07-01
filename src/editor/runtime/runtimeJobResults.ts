import type { CoreDerivedApplyBlockReason, CoreDerivedApplyRef } from "../coreBinding/revisionGuards"
import { applyEditorJobResult, type EditorJobResult } from "../jobs/jobResults"
import { applyRuntimeCoreDerivedResult } from "./runtimeApplyGate"
import type { EditorRuntimeState } from "./editorState"

export type RuntimeJobResultApplyStatus = "applied" | "blocked-stale" | "missing-job"

export interface RuntimeJobResultApply {
  reason: CoreDerivedApplyBlockReason | "missing-job" | null
  state: EditorRuntimeState
  status: RuntimeJobResultApplyStatus
}

function markJobResultStale(
  state: EditorRuntimeState,
  result: EditorJobResult & CoreDerivedApplyRef,
  reason: CoreDerivedApplyBlockReason,
): EditorRuntimeState {
  return {
    ...state,
    jobs: applyEditorJobResult(state.jobs, {
      ...result,
      status: "stale",
      summary: `Blocked stale job result: ${reason}`,
    }),
  }
}

export function applyRuntimeJobResult(
  state: EditorRuntimeState,
  result: EditorJobResult,
): RuntimeJobResultApply {
  const job = state.jobs.jobs.find((candidate) => candidate.id === result.jobId)
  if (!job) {
    return {
      reason: "missing-job",
      state,
      status: "missing-job",
    }
  }

  const applied = applyRuntimeCoreDerivedResult(
    state,
    {
      ...result,
      baseRevision: job.requestRevision,
      documentId: result.producedDocumentId ?? state.core.envelope.documentId,
      sourceRevision: result.producedRevision ?? job.requestRevision,
      stale: result.status === "stale",
    },
    (currentState, freshResult) => ({
      ...currentState,
      jobs: applyEditorJobResult(currentState.jobs, freshResult),
    }),
    markJobResultStale,
  )

  return {
    reason: applied.decision.reason,
    state: applied.state,
    status: applied.decision.status === "accepted" ? "applied" : "blocked-stale",
  }
}
