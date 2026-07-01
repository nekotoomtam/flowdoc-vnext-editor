import {
  loadReadOnlyCoreSnapshot,
  type LoadReadOnlyCoreSnapshotOptions,
} from "../../core/coreAdapter"
import {
  cloneCoreReadBindingFailures,
  type CoreAdapterReadResult,
  type CoreAdapterSnapshot,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
} from "../../core/coreTypes"
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
    LoadReadOnlyCoreSnapshotOptions {}

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
    failures: snapshot.failures,
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
  const shouldCreateRenderProjection =
    options.includeRenderProjection !== false && snapshot.renderProjectionAvailable
  const renderProjection =
    !shouldCreateRenderProjection
      ? null
      : createRenderProjectionSummary(projectRenderDocument(readModel), {
          documentId: envelope.documentId,
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

export type FrontendCoreWorkingSetBindingStatus = "blocked" | "bound"

export interface FrontendCoreWorkingSetBinding {
  failures: CoreReadBindingFailure[]
  readResult: CoreAdapterReadResult
  status: FrontendCoreWorkingSetBindingStatus
  workingSet: FrontendCoreWorkingSet | null
}

export function bindFrontendCoreWorkingSetFromReadResult(
  readResult: CoreAdapterReadResult,
  options: CreateFrontendCoreWorkingSetOptions = {},
): FrontendCoreWorkingSetBinding {
  if (!readResult.snapshot || readResult.envelope.status === "blocked") {
    return {
      failures: cloneCoreReadBindingFailures(readResult.envelope.failures),
      readResult,
      status: "blocked",
      workingSet: null,
    }
  }

  const workingSet = createFrontendCoreWorkingSetFromSnapshot(readResult.snapshot, options)

  return {
    failures: cloneCoreReadBindingFailures(workingSet.envelope.failures),
    readResult,
    status: "bound",
    workingSet,
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
      failures: [],
      layoutGeneration: options.layoutGeneration ?? null,
      measurementProfileId: options.measurementProfileId ?? null,
      renderProjectionAvailable: true,
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
  const binding = bindFrontendCoreWorkingSetFromReadResult(
    loadReadOnlyCoreSnapshot(options),
    options,
  )

  if (!binding.workingSet) {
    throw new Error("Initial core working set is blocked by the read-only core binding.")
  }

  return binding.workingSet
}
