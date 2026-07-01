import type { CoreDerivedApplyBlockReason, CoreDerivedApplyRef } from "../coreBinding/revisionGuards"
import type { RenderProjectionSummary } from "../coreBinding/renderProjectionSummary"
import { applyRuntimeCoreDerivedResult } from "./runtimeApplyGate"
import type { EditorRuntimeState } from "./editorState"

export interface RuntimeRenderProjectionResult extends CoreDerivedApplyRef {
  renderProjection: RenderProjectionSummary | null
}

export type RuntimeRenderProjectionApplyStatus = "applied" | "blocked-stale"

export interface RuntimeRenderProjectionApply {
  reason: CoreDerivedApplyBlockReason | null
  state: EditorRuntimeState
  status: RuntimeRenderProjectionApplyStatus
}

function cloneIdMap(map: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, [...value]]))
}

function cloneRenderProjectionSummary(summary: RenderProjectionSummary): RenderProjectionSummary {
  return {
    ...summary,
    nodeToBlockIds: cloneIdMap(summary.nodeToBlockIds),
    nodeToFragmentIds: cloneIdMap(summary.nodeToFragmentIds),
  }
}

function cloneRenderProjectionSummaryOrNull(
  summary: RenderProjectionSummary | null,
): RenderProjectionSummary | null {
  return summary ? cloneRenderProjectionSummary(summary) : null
}

export function applyRuntimeRenderProjectionResult(
  state: EditorRuntimeState,
  result: RuntimeRenderProjectionResult,
): RuntimeRenderProjectionApply {
  const applied = applyRuntimeCoreDerivedResult(
    state,
    result,
    (currentState, freshResult) => ({
      ...currentState,
      core: {
        ...currentState.core,
        renderProjection: cloneRenderProjectionSummaryOrNull(freshResult.renderProjection),
      },
    }),
    (currentState) => currentState,
  )

  return {
    reason: applied.decision.reason,
    state: applied.state,
    status: applied.decision.status === "accepted" ? "applied" : "blocked-stale",
  }
}
