export interface CoreEditorDocumentSummary {
  id: string
  title: string
  packageVersion: number
  documentVersion: number
  runtimeMode?: "active" | "partial" | "read-only"
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

export type CoreEditorChildrenField = "cellIds" | "childIds" | "columnIds" | "rowIds"

export type CoreEditorOperationSurface =
  | "columns"
  | "generated"
  | "media"
  | "table"
  | "text-block"
  | "utility"
  | "zone"

export type CoreEditorTextRole =
  | "caption"
  | "heading"
  | "label"
  | "list-item"
  | "note"
  | "paragraph"

export interface CoreEditorNearestContext {
  blockId: string | null
  columnId: string | null
  columnsId: string | null
  sectionId: string
  tableCellId: string | null
  tableId: string | null
  tableRowId: string | null
  textBlockId: string | null
  zoneId: string
}

export interface CoreEditorNodeCapabilities {
  canBeDeleted: boolean
  canBeDuplicated: boolean
  canBeReordered: boolean
  canContainText: boolean
  canSplitAcrossPages: boolean
  childrenField?: CoreEditorChildrenField
}

export interface CoreEditorNodeSummary {
  capabilities?: CoreEditorNodeCapabilities | null
  childIds: string[]
  headingLevel?: number | null
  id: string
  label: string
  nearest?: CoreEditorNearestContext | null
  operationSurface?: CoreEditorOperationSurface | null
  parentId: string | null
  sectionId: string | null
  textRole?: CoreEditorTextRole | null
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
  | "invalid-source-kind"
  | "missing-package"
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

export type CoreReadEnvelopePurpose =
  | "initial-load"
  | "refresh"
  | "job-result"
  | "local-draft"
  | "mutation-result"

export interface CoreReadTransportEnvelope {
  baseRevision: number | null
  documentId: string
  envelopeId: string
  packageValue: unknown
  purpose: CoreReadEnvelopePurpose
  receivedAt: number
  requestedAt: number
  sourceKind: CoreAdapterSnapshotSourceKind
  sourceRevision?: number | null
}

export interface ActiveCoreReadRevision {
  documentId: string
  documentRevision: number
}

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
  sourceRevision: number | null
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
