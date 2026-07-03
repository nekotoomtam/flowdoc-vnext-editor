import {
  cloneCoreReadBindingFailures,
  type CoreAdapterReadRequest,
  type CoreAdapterReadResult,
  type CoreAdapterSnapshot,
  type CoreAdapterSnapshotSourceKind,
  type CoreEditorSeed,
  type CoreReadBindingFailure,
} from "./coreTypes"

const DEFAULT_DOCUMENT_ID = "placeholder-document"

export interface CreateCoreReadRequestOptions {
  baseRevision?: number | null
  createdAt?: number
  documentId?: string
  requireDiagnostics?: boolean
  requireRenderProjection?: boolean
  sourceKind?: CoreAdapterSnapshotSourceKind
  sourceRevision?: number | null
}

export interface CreateReadResultFromSeedOptions {
  simulateMissingDiagnostics?: boolean
  simulateMissingRenderProjection?: boolean
}

export function createCoreReadFailure(
  failure: CoreReadBindingFailure,
): CoreReadBindingFailure {
  return { ...failure }
}

export function createReadRequest(
  options: CreateCoreReadRequestOptions = {},
): CoreAdapterReadRequest {
  return {
    baseRevision: options.baseRevision ?? null,
    documentId: options.documentId ?? DEFAULT_DOCUMENT_ID,
    requestedAt: options.createdAt ?? Date.now(),
    requireDiagnostics: options.requireDiagnostics ?? true,
    requireRenderProjection: options.requireRenderProjection ?? true,
    sourceKind: options.sourceKind ?? "fixture",
    sourceRevision: options.sourceRevision ?? null,
  }
}

export function createReadResultEnvelope(
  request: CoreAdapterReadRequest,
  snapshot: CoreAdapterSnapshot | null,
  failures: CoreReadBindingFailure[],
): CoreAdapterReadResult["envelope"] {
  return {
    baseRevision: request.baseRevision,
    coreRevision: snapshot?.coreRevision ?? null,
    documentId: request.documentId,
    documentRevision: snapshot?.snapshotRevision ?? null,
    failures: cloneCoreReadBindingFailures(failures),
    receivedAt: request.requestedAt,
    snapshotRevision: snapshot?.snapshotRevision ?? null,
    sourceKind: request.sourceKind,
    status: snapshot?.status ?? "blocked",
  }
}

export function createBlockedReadResult(
  request: CoreAdapterReadRequest,
  failures: CoreReadBindingFailure[],
): CoreAdapterReadResult {
  return {
    envelope: createReadResultEnvelope(request, null, failures),
    request,
    snapshot: null,
  }
}

function createCoreRevision(
  request: CoreAdapterReadRequest,
  seed: CoreEditorSeed,
): string {
  const documentRevision = request.sourceRevision ?? seed.document.documentVersion

  if (request.sourceKind === "fixture") {
    return `fixture:${documentRevision}`
  }

  return `${request.sourceKind}:${seed.document.id}:${documentRevision}`
}

export function createReadResultFromSeed(
  request: CoreAdapterReadRequest,
  seed: CoreEditorSeed,
  options: CreateReadResultFromSeedOptions = {},
): CoreAdapterReadResult {
  const documentRevision = request.sourceRevision ?? seed.document.documentVersion
  const failures: CoreReadBindingFailure[] = []

  if (request.documentId !== seed.document.id) {
    failures.push(createCoreReadFailure({
      code: "document-mismatch",
      documentId: seed.document.id,
      expectedDocumentId: request.documentId,
      message: "The core snapshot document does not match the requested document.",
      sourceRevision: documentRevision,
    }))
  }

  if (
    request.baseRevision !== null
    && request.sourceKind !== "mutation-result"
    && request.baseRevision !== documentRevision
  ) {
    failures.push(createCoreReadFailure({
      baseRevision: request.baseRevision,
      code: "revision-stale",
      documentId: seed.document.id,
      message: "The core snapshot does not match the requested base revision.",
      sourceRevision: documentRevision,
    }))
  }

  if (options.simulateMissingDiagnostics && request.requireDiagnostics) {
    failures.push(createCoreReadFailure({
      code: "missing-diagnostics",
      documentId: seed.document.id,
      message: "The core snapshot did not include diagnostics.",
      sourceRevision: documentRevision,
    }))
  }

  if (options.simulateMissingRenderProjection && request.requireRenderProjection) {
    failures.push(createCoreReadFailure({
      code: "missing-render-projection",
      documentId: seed.document.id,
      message: "The core snapshot did not include a render projection seed.",
      sourceRevision: documentRevision,
    }))
  }

  const isBlocked = failures.some((failure) => (
    failure.code === "document-mismatch" || failure.code === "revision-stale"
  ))
  const status = isBlocked
    ? "blocked"
    : failures.length > 0
      ? "partial"
      : "fresh"

  const snapshot: CoreAdapterSnapshot = {
    coreRevision: createCoreRevision(request, seed),
    createdAt: request.requestedAt,
    failures: cloneCoreReadBindingFailures(failures),
    layoutGeneration: null,
    measurementProfileId: null,
    renderProjectionAvailable: !options.simulateMissingRenderProjection,
    schemaVersion: seed.document.packageVersion,
    seed,
    snapshotRevision: documentRevision,
    sourceKind: request.sourceKind,
    status,
  }

  return {
    envelope: createReadResultEnvelope(request, snapshot, failures),
    request,
    snapshot,
  }
}
