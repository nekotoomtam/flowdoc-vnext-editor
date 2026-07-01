import {
  getCoreDerivedApplyBlockReason,
  type CoreDerivedApplyBlockReason,
  type CoreDerivedApplyRef,
} from "../coreBinding/revisionGuards"
import type { EditorRuntimeState } from "./editorState"

export type RuntimeApplyGateDecision<Result extends CoreDerivedApplyRef> =
  | {
      reason: null
      result: Result
      status: "accepted"
    }
  | {
      reason: CoreDerivedApplyBlockReason
      result: Result & { stale: true }
      status: "blocked-stale"
    }

export function decideRuntimeCoreDerivedApply<Result extends CoreDerivedApplyRef>(
  state: EditorRuntimeState,
  result: Result,
): RuntimeApplyGateDecision<Result> {
  const reason = getCoreDerivedApplyBlockReason(result, state.core.envelope)

  if (reason) {
    return {
      reason,
      result: {
        ...result,
        stale: true,
      },
      status: "blocked-stale",
    }
  }

  return {
    reason: null,
    result,
    status: "accepted",
  }
}

export interface RuntimeApplyResult<State, Result extends CoreDerivedApplyRef> {
  decision: RuntimeApplyGateDecision<Result>
  state: State
}

export function applyRuntimeCoreDerivedResult<Result extends CoreDerivedApplyRef>(
  state: EditorRuntimeState,
  result: Result,
  applyFresh: (state: EditorRuntimeState, result: Result) => EditorRuntimeState,
  applyStale: (state: EditorRuntimeState, result: Result, reason: CoreDerivedApplyBlockReason) => EditorRuntimeState,
): RuntimeApplyResult<EditorRuntimeState, Result> {
  const decision = decideRuntimeCoreDerivedApply(state, result)

  if (decision.status === "blocked-stale") {
    return {
      decision,
      state: applyStale(state, decision.result, decision.reason),
    }
  }

  return {
    decision,
    state: applyFresh(state, result),
  }
}
