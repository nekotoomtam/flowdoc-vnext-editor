import type { CoreDiagnosticsSummary, CoreEditorSeed } from "../../core/coreTypes"

export type CoreSnapshotSource = "api" | "fixture" | "local-draft"

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
  diagnostics: CoreDiagnosticsSummary
  documentId: string
  documentRevision: number
  documentVersion: number
  layoutGeneration: string | null
  measurementProfileId: string | null
  packageVersion: number
  schemaVersion: number
  snapshotRevision: number
  source: CoreSnapshotSource
  status: CoreSnapshotStatus
}

export interface CoreSnapshotEnvelopeOptions {
  capabilities?: CoreCapabilitySummary
  coreRevision?: string
  layoutGeneration?: string | null
  measurementProfileId?: string | null
  schemaVersion?: number
  snapshotRevision?: number
  source?: CoreSnapshotSource
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

  return {
    capabilities: options.capabilities ?? createDefaultCoreCapabilitySummary(),
    coreRevision: options.coreRevision ?? `fixture:${documentRevision}`,
    diagnostics: seed.diagnostics,
    documentId: seed.document.id,
    documentRevision,
    documentVersion: seed.document.documentVersion,
    layoutGeneration: options.layoutGeneration ?? null,
    measurementProfileId: options.measurementProfileId ?? null,
    packageVersion: seed.document.packageVersion,
    schemaVersion: options.schemaVersion ?? seed.document.packageVersion,
    snapshotRevision: options.snapshotRevision ?? documentRevision,
    source: options.source ?? "fixture",
    status: options.status ?? "fresh",
  }
}
