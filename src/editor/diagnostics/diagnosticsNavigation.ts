export interface DiagnosticsNavigationIntent {
  issueId: string
  nodeId: string | null
}

export function createDiagnosticsNavigationIntent(
  issueId: string,
  nodeId: string | null,
): DiagnosticsNavigationIntent {
  return {
    issueId,
    nodeId,
  }
}
