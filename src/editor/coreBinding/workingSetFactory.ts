import { loadInitialCoreSnapshot, type LoadInitialCoreSnapshotOptions } from "../../core/coreAdapter"
import type { CoreAdapterSnapshot, CoreEditorSeed } from "../../core/coreTypes"
import { projectRenderDocument } from "../render/renderProjector"
import { createCommandCapabilityMirror } from "./capabilityMirror"
import { createCoreSnapshotEnvelope } from "./coreEnvelope"
import { createEditorReadModel } from "./readModel"
import { createRenderProjectionSummary, type RenderProjectionKind } from "./renderProjectionSummary"
import type { FrontendCoreWorkingSet } from "./workingSetTypes"

export interface CreateFrontendCoreWorkingSetOptions {
  includeRenderProjection?: boolean
  renderProjectionKind?: RenderProjectionKind
}

export interface LoadInitialCoreWorkingSetOptions
  extends CreateFrontendCoreWorkingSetOptions,
    LoadInitialCoreSnapshotOptions {}

export interface CreateFrontendCoreWorkingSetFromSeedOptions
  extends CreateFrontendCoreWorkingSetOptions {
  coreRevision?: string
  createdAt?: number
  layoutGeneration?: string | null
  measurementProfileId?: string | null
  schemaVersion?: number
  snapshotRevision?: number
  sourceKind?: CoreAdapterSnapshot["sourceKind"]
  status?: CoreAdapterSnapshot["status"]
}

export function createFrontendCoreWorkingSetFromSnapshot(
  snapshot: CoreAdapterSnapshot,
  options: CreateFrontendCoreWorkingSetOptions = {},
): FrontendCoreWorkingSet {
  const envelope = createCoreSnapshotEnvelope(snapshot.seed, {
    coreRevision: snapshot.coreRevision,
    createdAt: snapshot.createdAt,
    layoutGeneration: snapshot.layoutGeneration,
    measurementProfileId: snapshot.measurementProfileId,
    schemaVersion: snapshot.schemaVersion,
    snapshotRevision: snapshot.snapshotRevision,
    sourceKind: snapshot.sourceKind,
    status: snapshot.status,
  })
  const readModel = createEditorReadModel(snapshot.seed, {
    sourceRevision: envelope.documentRevision,
  })
  const capabilities = createCommandCapabilityMirror(readModel)
  const renderProjection =
    options.includeRenderProjection === false
      ? null
      : createRenderProjectionSummary(projectRenderDocument(readModel), {
          kind: options.renderProjectionKind ?? "placeholder",
          layoutGeneration: envelope.layoutGeneration,
          sourceRevision: envelope.documentRevision,
        })

  return {
    capabilities,
    diagnostics: envelope.diagnostics,
    document: { ...snapshot.seed.document },
    envelope,
    readModel,
    renderProjection,
  }
}

export function createFrontendCoreWorkingSetFromSeed(
  seed: CoreEditorSeed,
  options: CreateFrontendCoreWorkingSetFromSeedOptions = {},
): FrontendCoreWorkingSet {
  const documentRevision = seed.document.documentVersion

  return createFrontendCoreWorkingSetFromSnapshot(
    {
      coreRevision: options.coreRevision ?? `fixture:${documentRevision}`,
      createdAt: options.createdAt ?? Date.now(),
      layoutGeneration: options.layoutGeneration ?? null,
      measurementProfileId: options.measurementProfileId ?? null,
      schemaVersion: options.schemaVersion ?? seed.document.packageVersion,
      seed,
      snapshotRevision: options.snapshotRevision ?? documentRevision,
      sourceKind: options.sourceKind ?? "fixture",
      status: options.status ?? "fresh",
    },
    options,
  )
}

export function loadInitialCoreWorkingSet(
  options: LoadInitialCoreWorkingSetOptions = {},
): FrontendCoreWorkingSet {
  return createFrontendCoreWorkingSetFromSnapshot(loadInitialCoreSnapshot(options), options)
}
