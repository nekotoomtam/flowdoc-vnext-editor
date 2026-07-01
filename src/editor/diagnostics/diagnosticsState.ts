import type { CoreDiagnosticsSummary } from "../../core/coreTypes"

export interface DiagnosticsState {
  summary: CoreDiagnosticsSummary
}

export function createDiagnosticsState(summary: CoreDiagnosticsSummary): DiagnosticsState {
  return {
    summary,
  }
}
