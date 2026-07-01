export interface CoreEditorDocumentSummary {
  id: string
  title: string
  packageVersion: number
  documentVersion: number
}

export interface CoreDiagnosticsSummary {
  artifactStatus: string
  exactLayoutStatus: string
  generationStatus: string
  graphIssueCount: number
  keyDataStatus: string
}

export interface CoreEditorSectionSummary {
  id: string
  label: string
}

export interface CoreEditorZoneSummary {
  id: string
  label: string
  sectionId: string
}

export interface CoreEditorNodeSummary {
  childIds: string[]
  id: string
  label: string
  parentId: string | null
  sectionId: string | null
  type: string
  zoneId: string | null
}

export interface CoreEditorSeed {
  diagnostics: CoreDiagnosticsSummary
  document: CoreEditorDocumentSummary
  nodes: CoreEditorNodeSummary[]
  sections: CoreEditorSectionSummary[]
  zones: CoreEditorZoneSummary[]
}

export type CoreReadBindingFailureCode =
  | "blocked-by-core"
  | "core-unavailable"
  | "document-mismatch"
  | "invalid-envelope"
  | "missing-diagnostics"
  | "missing-render-projection"
  | "revision-stale"
  | "unknown-core-result"

export interface CoreReadBindingFailure {
  baseRevision?: number | null
  code: CoreReadBindingFailureCode
  documentId?: string | null
  expectedDocumentId?: string | null
  message: string
  sourceRevision?: number | null
}

export type CoreAdapterSnapshotSourceKind =
  | "api"
  | "fixture"
  | "job-result"
  | "local-draft"
  | "mutation-result"

export type CoreAdapterSnapshotStatus = "blocked" | "fresh" | "partial" | "stale"

export interface CoreAdapterSnapshot {
  coreRevision: string
  createdAt: number
  failures: CoreReadBindingFailure[]
  layoutGeneration: string | null
  measurementProfileId: string | null
  renderProjectionAvailable: boolean
  schemaVersion: number
  seed: CoreEditorSeed
  snapshotRevision: number
  sourceKind: CoreAdapterSnapshotSourceKind
  status: CoreAdapterSnapshotStatus
}

export interface CoreAdapterReadRequest {
  baseRevision: number | null
  documentId: string
  requestedAt: number
  requireDiagnostics: boolean
  requireRenderProjection: boolean
  sourceKind: CoreAdapterSnapshotSourceKind
}

export interface CoreAdapterReadResultEnvelope {
  baseRevision: number | null
  coreRevision: string | null
  documentId: string
  documentRevision: number | null
  failures: CoreReadBindingFailure[]
  receivedAt: number
  snapshotRevision: number | null
  sourceKind: CoreAdapterSnapshotSourceKind
  status: CoreAdapterSnapshotStatus
}

export interface CoreAdapterReadResult {
  envelope: CoreAdapterReadResultEnvelope
  request: CoreAdapterReadRequest
  snapshot: CoreAdapterSnapshot | null
}

export function cloneCoreReadBindingFailures(
  failures: CoreReadBindingFailure[],
): CoreReadBindingFailure[] {
  return failures.map((failure) => ({ ...failure }))
}
