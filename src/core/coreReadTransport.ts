import type {
  ActiveCoreReadRevision,
  CoreAdapterReadRequest,
  CoreAdapterReadResult,
  CoreAdapterSnapshotSourceKind,
  CoreReadBindingFailure,
  CoreReadEnvelopePurpose,
  CoreReadTransportEnvelope,
} from "./coreTypes"
import {
  type CorePackageReadDependencies,
  loadReadOnlyCoreSnapshotFromPackage,
} from "./corePackageRead"
import {
  createBlockedReadResult,
  createCoreReadFailure,
  createReadRequest,
} from "./coreReadResult"

const UNKNOWN_TRANSPORT_DOCUMENT_ID = "unknown-document"

const CORE_READ_TRANSPORT_SOURCE_KINDS: CoreAdapterSnapshotSourceKind[] = [
  "api",
  "fixture",
  "job-result",
  "local-draft",
  "mutation-result",
]

const CORE_READ_ENVELOPE_PURPOSES: CoreReadEnvelopePurpose[] = [
  "initial-load",
  "refresh",
  "job-result",
  "local-draft",
]

export type CoreReadTransportEnvelopeValidation =
  | {
      envelope: CoreReadTransportEnvelope
      status: "accepted"
    }
  | {
      failure: CoreReadBindingFailure
      request: CoreAdapterReadRequest
      status: "blocked"
    }

export type CoreReadTransportDependencies = CorePackageReadDependencies

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function isCoreAdapterSnapshotSourceKind(
  value: unknown,
): value is CoreAdapterSnapshotSourceKind {
  return CORE_READ_TRANSPORT_SOURCE_KINDS.includes(value as CoreAdapterSnapshotSourceKind)
}

function isCoreReadEnvelopePurpose(value: unknown): value is CoreReadEnvelopePurpose {
  return CORE_READ_ENVELOPE_PURPOSES.includes(value as CoreReadEnvelopePurpose)
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function hasPackageValue(record: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(record, "packageValue")
    && record.packageValue !== undefined
    && record.packageValue !== null
}

function transportRequestFromInput(
  input: unknown,
  failure: CoreReadBindingFailure,
): CoreAdapterReadRequest {
  const record = isRecord(input) ? input : {}
  const sourceKind = isCoreAdapterSnapshotSourceKind(record.sourceKind)
    ? record.sourceKind
    : "api"
  const requestedAt = isTimestamp(record.receivedAt)
    ? record.receivedAt
    : isTimestamp(record.requestedAt)
      ? record.requestedAt
      : Date.now()
  const baseRevision = record.baseRevision === null || isRevision(record.baseRevision)
    ? record.baseRevision
    : null
  const documentId =
    failure.expectedDocumentId
    ?? failure.documentId
    ?? nonEmptyString(record.documentId)
    ?? UNKNOWN_TRANSPORT_DOCUMENT_ID

  return createReadRequest({
    baseRevision,
    createdAt: requestedAt,
    documentId,
    sourceKind,
  })
}

function rejectedTransportEnvelope(
  input: unknown,
  failure: CoreReadBindingFailure,
): CoreReadTransportEnvelopeValidation {
  return {
    failure,
    request: transportRequestFromInput(input, failure),
    status: "blocked",
  }
}

export function validateCoreReadTransportEnvelope(
  input: unknown,
): CoreReadTransportEnvelopeValidation {
  if (!isRecord(input)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      message: "The core read transport envelope must be an object.",
    }))
  }

  const envelopeId = nonEmptyString(input.envelopeId)
  if (!envelopeId) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId: nonEmptyString(input.documentId),
      message: "The core read transport envelope requires envelopeId.",
    }))
  }

  const documentId = nonEmptyString(input.documentId)
  if (!documentId) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      message: "The core read transport envelope requires documentId.",
    }))
  }

  if (!isCoreAdapterSnapshotSourceKind(input.sourceKind)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-source-kind",
      documentId,
      message: "The core read transport envelope sourceKind is not supported.",
    }))
  }

  if (!isCoreReadEnvelopePurpose(input.purpose)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope purpose is not supported.",
    }))
  }

  const baseRevision = input.baseRevision
  if (baseRevision !== null && !isRevision(baseRevision)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope baseRevision must be a non-negative integer or null.",
    }))
  }

  if (input.purpose !== "initial-load" && baseRevision === null) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope requires baseRevision outside initial load.",
    }))
  }

  if (!isTimestamp(input.requestedAt) || !isTimestamp(input.receivedAt)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "invalid-envelope",
      documentId,
      message: "The core read transport envelope requires numeric requestedAt and receivedAt.",
    }))
  }

  if (!hasPackageValue(input)) {
    return rejectedTransportEnvelope(input, createCoreReadFailure({
      code: "missing-package",
      documentId,
      message: "The core read transport envelope requires packageValue.",
    }))
  }

  return {
    envelope: {
      baseRevision,
      documentId,
      envelopeId,
      packageValue: input.packageValue,
      purpose: input.purpose,
      receivedAt: input.receivedAt,
      requestedAt: input.requestedAt,
      sourceKind: input.sourceKind,
    },
    status: "accepted",
  }
}

export function loadReadOnlyCoreSnapshotFromEnvelope(
  envelopeValue: unknown,
  active: ActiveCoreReadRevision | undefined,
  dependencies: CoreReadTransportDependencies,
): CoreAdapterReadResult {
  const validation = validateCoreReadTransportEnvelope(envelopeValue)

  if (validation.status === "blocked") {
    return createBlockedReadResult(validation.request, [validation.failure])
  }

  const envelope = validation.envelope
  const request = createReadRequest({
    baseRevision: envelope.baseRevision,
    createdAt: envelope.receivedAt,
    documentId: envelope.documentId,
    sourceKind: envelope.sourceKind,
  })

  if (active && active.documentId !== envelope.documentId) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        code: "document-mismatch",
        documentId: envelope.documentId,
        expectedDocumentId: active.documentId,
        message: "The core read transport envelope does not match the active document.",
        sourceRevision: active.documentRevision,
      }),
    ])
  }

  if (
    active
    && envelope.purpose !== "initial-load"
    && envelope.baseRevision !== active.documentRevision
  ) {
    return createBlockedReadResult(request, [
      createCoreReadFailure({
        baseRevision: envelope.baseRevision,
        code: "revision-stale",
        documentId: envelope.documentId,
        message: "The core read transport envelope does not match the active revision.",
        sourceRevision: active.documentRevision,
      }),
    ])
  }

  return loadReadOnlyCoreSnapshotFromPackage(envelope.packageValue, {
    baseRevision: envelope.baseRevision,
    createdAt: envelope.receivedAt,
    documentId: envelope.documentId,
    sourceKind: envelope.sourceKind,
  }, dependencies)
}
