import type {
  PublishedPreviewAdmissionReceipt,
  PublishedPreviewContext,
} from "./publishedPreviewContracts"
import { createVNextCompactFingerprint } from "../../core/coreAdapter"

export const EXACT_PREVIEW_RECONNECT_STORAGE_PREFIX = "flowdoc:realdoc:e63:exact-preview:"
export const EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY = `${EXACT_PREVIEW_RECONNECT_STORAGE_PREFIX}active-target`

export type ExactPreviewReconnectTarget = "draft" | "published"

export interface ExactPreviewReconnectContext {
  contextFingerprint: PublishedPreviewContext["contextFingerprint"]
  authoring: PublishedPreviewContext["authoring"]
  projection: PublishedPreviewContext["projection"]
  mappingProfiles: PublishedPreviewContext["mappingProfiles"]
}

export interface ExactPreviewReconnectRecordV1 {
  contractVersion: 1
  kind: "editor-exact-preview-reconnect"
  target: ExactPreviewReconnectTarget
  context: {
    contextFingerprint: string
    authoringDocumentId: string
    authoringDocumentRevision: number
    projectionFingerprint: string
  }
  inputIdentity: string
  admissionKey: string
  exportKey: string
  cancelKey: string | null
  receipt: PublishedPreviewAdmissionReceipt
  operationId: string | null
  contracts: {
    contentFree: true
    sessionStorageOnly: true
    formValuesStored: false
    rawJsonPayloadStored: false
    canonicalBusinessDataStored: false
    productionBinding: false
  }
}

export interface ExactPreviewReconnectStore {
  read(target: ExactPreviewReconnectTarget): unknown
  write(record: ExactPreviewReconnectRecordV1): void
  clear(target: ExactPreviewReconnectTarget): void
}

export function createExactPreviewInputIdentityV1(input: {
  target: ExactPreviewReconnectTarget
  context: ExactPreviewReconnectContext
  value:
    | { kind: "canonical-data"; data: unknown; collections: unknown }
    | { kind: "adapted-json"; payloadText: string; profileFingerprint: string | null }
}): string {
  const common = [
    input.target,
    input.value.kind,
    input.context.contextFingerprint,
    input.context.authoring.documentId,
    input.context.authoring.documentRevision,
    input.context.projection.projectionFingerprint,
  ]
  return createVNextCompactFingerprint(JSON.stringify(input.value.kind === "canonical-data"
    ? [...common, input.value.data, input.value.collections]
    : [...common, input.value.payloadText, input.value.profileFingerprint]))
}

const SHA256 = /^sha256:[a-f0-9]{64}$/u

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function bounded(value: unknown, maximum = 512): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum
}

function revision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function ownerMatches(value: unknown, context: ExactPreviewReconnectContext): boolean {
  const owner = context.projection.owner
  return record(value)
    && exactKeys(value, ["structureId", "structureVersionId", "versionOrdinal"])
    && value.structureId === owner.structureId
    && value.structureVersionId === owner.structureVersionId
    && value.versionOrdinal === owner.versionOrdinal
}

function diagnosticEntry(value: unknown, severity: "error" | "warning"): boolean {
  if (!record(value)) return false
  const allowed = new Set(["source", "severity", "code", "path", "message", "detailCode"])
  return Object.keys(value).every((key) => allowed.has(key))
    && value.severity === severity
    && bounded(value.code)
    && typeof value.path === "string"
    && bounded(value.message, 2_048)
    && (value.source === undefined || bounded(value.source))
    && (value.detailCode === undefined || bounded(value.detailCode))
}

function diagnostics(value: unknown): value is PublishedPreviewAdmissionReceipt["diagnostics"] {
  if (!record(value)
    || !exactKeys(value, ["contentFree", "issues", "warnings", "summary", "diagnosticsFingerprint"])
    || value.contentFree !== true
    || !Array.isArray(value.issues)
    || !Array.isArray(value.warnings)
    || !record(value.summary)
    || !exactKeys(value.summary, [
      "errorCount", "warningCount", "scalarValueCount", "collectionSnapshotCount", "collectionItemCount",
      "mediaAssetCount", "defaultAppliedCount",
    ])
    || !Object.values(value.summary).every(count)
    || !SHA256.test(String(value.diagnosticsFingerprint))) return false
  return value.issues.every((entry) => diagnosticEntry(entry, "error"))
    && value.warnings.every((entry) => diagnosticEntry(entry, "warning"))
}

function receipt(value: unknown, context: ExactPreviewReconnectContext): value is PublishedPreviewAdmissionReceipt {
  if (!record(value) || !exactKeys(value, [
    "admissionId", "status", "lane", "structure", "dataContract", "instance", "inputFingerprint",
    "canonicalInputFingerprint", "canonicalContentFingerprint", "mappingProfile", "diagnostics", "execution",
    "contracts", "receiptFingerprint",
  ])) return false
  if (!bounded(value.admissionId)
    || value.status !== "ready" && value.status !== "ready-with-warnings"
    || value.lane !== "direct" && value.lane !== "adapted"
    || !ownerMatches(value.structure, context)
    || !record(value.dataContract)
    || !exactKeys(value.dataContract, [
      "dataContractId", "dataContractFingerprint", "publishedStructureFingerprint",
    ])
    || value.dataContract.dataContractId !== context.projection.dataContract.dataContractId
    || value.dataContract.dataContractFingerprint !== context.projection.dataContract.dataContractFingerprint
    || value.dataContract.publishedStructureFingerprint !== context.projection.structureFingerprint
    || !record(value.instance)
    || !exactKeys(value.instance, ["contractVersion", "kind", "instanceId", "revision", "structureVersion"])
    || value.instance.contractVersion !== 1
    || value.instance.kind !== "document-instance"
    || !bounded(value.instance.instanceId)
    || !revision(value.instance.revision)
    || !ownerMatches(value.instance.structureVersion, context)
    || !SHA256.test(String(value.inputFingerprint))
    || !SHA256.test(String(value.canonicalInputFingerprint))
    || !SHA256.test(String(value.canonicalContentFingerprint))
    || !diagnostics(value.diagnostics)
    || !record(value.execution)
    || !exactKeys(value.execution, [
      "mapping", "runtimeValidation", "materialization", "resolution", "measurement", "pagination", "artifact",
    ])
    || value.execution.mapping !== (value.lane === "direct" ? "not-required" : "executed")
    || value.execution.runtimeValidation !== "run-valid"
    || value.execution.materialization !== "not-run"
    || value.execution.resolution !== "not-run"
    || value.execution.measurement !== "not-run"
    || value.execution.pagination !== "not-run"
    || value.execution.artifact !== "not-run"
    || !record(value.contracts)
    || !exactKeys(value.contracts, [
      "canonicalBusinessDataExposed", "durablePersistence", "rawPayloadRetained", "productionBinding",
    ])
    || value.contracts.canonicalBusinessDataExposed !== false
    || value.contracts.durablePersistence !== true
    || value.contracts.rawPayloadRetained !== false
    || value.contracts.productionBinding !== false
    || !SHA256.test(String(value.receiptFingerprint))) return false
  if (value.lane === "direct") return value.mappingProfile === null
  const mappingProfile = value.mappingProfile
  if (!record(mappingProfile)
    || !exactKeys(mappingProfile, ["mappingProfileId", "mappingProfileVersion", "profileFingerprint"])
    || !bounded(mappingProfile.mappingProfileId)
    || !revision(mappingProfile.mappingProfileVersion)
    || !SHA256.test(String(mappingProfile.profileFingerprint))) return false
  return context.mappingProfiles.some(({ profile }) => (
    profile.mappingProfileId === mappingProfile.mappingProfileId
    && profile.mappingProfileVersion === mappingProfile.mappingProfileVersion
    && profile.profileFingerprint === mappingProfile.profileFingerprint
  ))
}

export function createExactPreviewReconnectRecordV1(input: {
  target: ExactPreviewReconnectTarget
  context: ExactPreviewReconnectContext
  inputIdentity: string
  admissionKey: string
  exportKey: string
  cancelKey: string | null
  receipt: PublishedPreviewAdmissionReceipt
  operationId: string | null
}): ExactPreviewReconnectRecordV1 {
  return structuredClone({
    contractVersion: 1,
    kind: "editor-exact-preview-reconnect",
    target: input.target,
    context: {
      contextFingerprint: input.context.contextFingerprint,
      authoringDocumentId: input.context.authoring.documentId,
      authoringDocumentRevision: input.context.authoring.documentRevision,
      projectionFingerprint: input.context.projection.projectionFingerprint,
    },
    inputIdentity: input.inputIdentity,
    admissionKey: input.admissionKey,
    exportKey: input.exportKey,
    cancelKey: input.cancelKey,
    receipt: input.receipt,
    operationId: input.operationId,
    contracts: {
      contentFree: true,
      sessionStorageOnly: true,
      formValuesStored: false,
      rawJsonPayloadStored: false,
      canonicalBusinessDataStored: false,
      productionBinding: false,
    },
  })
}

export function parseExactPreviewReconnectRecordV1(
  value: unknown,
  expected: { target: ExactPreviewReconnectTarget; context: ExactPreviewReconnectContext },
): ExactPreviewReconnectRecordV1 | null {
  if (!record(value) || !exactKeys(value, [
    "contractVersion", "kind", "target", "context", "inputIdentity", "admissionKey", "exportKey", "cancelKey",
    "receipt", "operationId", "contracts",
  ])) return null
  if (value.contractVersion !== 1
    || value.kind !== "editor-exact-preview-reconnect"
    || value.target !== expected.target
    || !record(value.context)
    || !exactKeys(value.context, [
      "contextFingerprint", "authoringDocumentId", "authoringDocumentRevision", "projectionFingerprint",
    ])
    || value.context.contextFingerprint !== expected.context.contextFingerprint
    || value.context.authoringDocumentId !== expected.context.authoring.documentId
    || value.context.authoringDocumentRevision !== expected.context.authoring.documentRevision
    || value.context.projectionFingerprint !== expected.context.projection.projectionFingerprint
    || !SHA256.test(String(value.inputIdentity))
    || !bounded(value.admissionKey)
    || !bounded(value.exportKey)
    || value.cancelKey !== null && !bounded(value.cancelKey)
    || value.operationId !== null && !bounded(value.operationId)
    || !receipt(value.receipt, expected.context)
    || !record(value.contracts)
    || !exactKeys(value.contracts, [
      "contentFree", "sessionStorageOnly", "formValuesStored", "rawJsonPayloadStored",
      "canonicalBusinessDataStored", "productionBinding",
    ])
    || value.contracts.contentFree !== true
    || value.contracts.sessionStorageOnly !== true
    || value.contracts.formValuesStored !== false
    || value.contracts.rawJsonPayloadStored !== false
    || value.contracts.canonicalBusinessDataStored !== false
    || value.contracts.productionBinding !== false) return null
  return structuredClone(value) as unknown as ExactPreviewReconnectRecordV1
}

function storageKey(target: ExactPreviewReconnectTarget): string {
  return `${EXACT_PREVIEW_RECONNECT_STORAGE_PREFIX}${target}`
}

export function parseExactPreviewReconnectTargetV1(value: unknown): ExactPreviewReconnectTarget | null {
  return value === "draft" || value === "published" ? value : null
}

export function readExactPreviewReconnectTargetV1(): ExactPreviewReconnectTarget | null {
  if (typeof window === "undefined") return null
  try {
    return parseExactPreviewReconnectTargetV1(
      window.sessionStorage.getItem(EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY),
    )
  } catch {
    return null
  }
}

export const browserExactPreviewReconnectStore: ExactPreviewReconnectStore = {
  read(target) {
    if (typeof window === "undefined") return null
    try {
      const value = window.sessionStorage.getItem(storageKey(target))
      return value == null ? null : JSON.parse(value) as unknown
    } catch {
      return null
    }
  },
  write(value) {
    if (typeof window === "undefined") return
    try {
      window.sessionStorage.setItem(storageKey(value.target), JSON.stringify(value))
      window.sessionStorage.setItem(EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY, value.target)
    } catch {
      // Reconnect is optional when browser session storage is unavailable.
    }
  },
  clear(target) {
    if (typeof window === "undefined") return
    try {
      window.sessionStorage.removeItem(storageKey(target))
      if (window.sessionStorage.getItem(EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY) === target) {
        window.sessionStorage.removeItem(EXACT_PREVIEW_RECONNECT_TARGET_STORAGE_KEY)
      }
    } catch {
      // A blocked store is equivalent to no reconnect state.
    }
  },
}
