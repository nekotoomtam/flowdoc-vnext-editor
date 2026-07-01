import type { CoreDiagnosticsSummary } from "../../core/coreTypes"
import type { CoreDerivedApplyBlockReason, CoreDerivedApplyRef } from "../coreBinding/revisionGuards"
import { applyRuntimeCoreDerivedResult } from "./runtimeApplyGate"
import type { EditorRuntimeState } from "./editorState"

export interface RuntimeDiagnosticsResult extends CoreDerivedApplyRef {
  diagnostics: CoreDiagnosticsSummary
}

export type RuntimeDiagnosticsApplyStatus = "applied" | "blocked-stale"

export interface RuntimeDiagnosticsApply {
  reason: CoreDerivedApplyBlockReason | null
  state: EditorRuntimeState
  status: RuntimeDiagnosticsApplyStatus
}

function cloneDiagnostics(summary: CoreDiagnosticsSummary): CoreDiagnosticsSummary {
  return { ...summary }
}

export function applyRuntimeDiagnosticsResult(
  state: EditorRuntimeState,
  result: RuntimeDiagnosticsResult,
): RuntimeDiagnosticsApply {
  const applied = applyRuntimeCoreDerivedResult(
    state,
    result,
    (currentState, freshResult) => {
      const diagnostics = cloneDiagnostics(freshResult.diagnostics)

      return {
        ...currentState,
        core: {
          ...currentState.core,
          diagnostics,
          envelope: {
            ...currentState.core.envelope,
            diagnostics: cloneDiagnostics(diagnostics),
          },
        },
        seed: {
          ...currentState.seed,
          diagnostics: cloneDiagnostics(diagnostics),
        },
      }
    },
    (currentState) => currentState,
  )

  return {
    reason: applied.decision.reason,
    state: applied.state,
    status: applied.decision.status === "accepted" ? "applied" : "blocked-stale",
  }
}
