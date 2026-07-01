import {
  cloneCoreReadBindingFailures,
  type CoreDiagnosticsSummary,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
} from "../../core/coreTypes"

export type WorkingSetSourceKind =
  | "api"
  | "fixture"
  | "job-result"
  | "local-draft"
  | "mutation-result"

export type CoreSnapshotStatus = "blocked" | "fresh" | "partial" | "stale"

export interface CoreCapabilitySummary {
  canCommitMutations: boolean
  canParsePackage: boolean
  canPrepareExport: boolean
  canReadExactLayout: boolean
  canRequestLiveLayout: boolean
  canRunBrowserSafeOperations: boolean
}

export interface CoreSnapshotEnvelope {
  capabilities: CoreCapabilitySummary
  coreRevision: string
  createdAt: number
  diagnostics: CoreDiagnosticsSummary
  documentId: string
  documentRevision: number
  documentVersion: number
  failures: CoreReadBindingFailure[]
  layoutGeneration: string | null
  measurementProfileId: string | null
  packageVersion: number
  schemaVersion: number
  snapshotRevision: number
  sourceKind: WorkingSetSourceKind
  status: CoreSnapshotStatus
}

export interface CoreSnapshotEnvelopeOptions {
  capabilities?: CoreCapabilitySummary
  coreRevision?: string
  createdAt?: number
  failures?: CoreReadBindingFailure[]
  layoutGeneration?: string | null
  measurementProfileId?: string | null
  schemaVersion?: number
  snapshotRevision?: number
  sourceKind?: WorkingSetSourceKind
  status?: CoreSnapshotStatus
}

export function createDefaultCoreCapabilitySummary(): CoreCapabilitySummary {
  return {
    canCommitMutations: false,
    canParsePackage: true,
    canPrepareExport: false,
    canReadExactLayout: false,
    canRequestLiveLayout: true,
    canRunBrowserSafeOperations: false,
  }
}

export function createCoreSnapshotEnvelope(
  seed: CoreEditorSeed,
  options: CoreSnapshotEnvelopeOptions = {},
): CoreSnapshotEnvelope {
  const documentRevision = seed.document.documentVersion
  const capabilities = options.capabilities ?? createDefaultCoreCapabilitySummary()

  return {
    capabilities: { ...capabilities },
    coreRevision: options.coreRevision ?? `fixture:${documentRevision}`,
    createdAt: options.createdAt ?? Date.now(),
    diagnostics: { ...seed.diagnostics },
    documentId: seed.document.id,
    documentRevision,
    documentVersion: seed.document.documentVersion,
    failures: cloneCoreReadBindingFailures(options.failures ?? []),
    layoutGeneration: options.layoutGeneration ?? null,
    measurementProfileId: options.measurementProfileId ?? null,
    packageVersion: seed.document.packageVersion,
    schemaVersion: options.schemaVersion ?? seed.document.packageVersion,
    snapshotRevision: options.snapshotRevision ?? documentRevision,
    sourceKind: options.sourceKind ?? "fixture",
    status: options.status ?? "fresh",
  }
}
