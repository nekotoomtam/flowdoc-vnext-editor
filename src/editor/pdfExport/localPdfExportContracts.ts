export const FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE = "/api/pdf-export-local"

export interface LocalPdfExportDocumentPin {
  documentId: string
  documentRevision: number
}

export type LocalPdfExportEligibilityStatus = "eligible" | "ineligible" | "stale"

export interface LocalPdfExportEligibility {
  source: "flowdoc-backend-pdf-export-local-eligibility"
  contractVersion: 1
  kind: "pdf-export-local-eligibility"
  status: LocalPdfExportEligibilityStatus
  documentId: string
  documentRevision: number
  lane: "canonical-evidence" | null
  reason: "unsupported-document" | "revision-mismatch" | null
  contracts: {
    exactDocumentPin: true
    requestBodyIdentityFieldsForbidden: true
    sameOriginDevelopmentProxyRequired: true
    productionBinding: false
  }
}

export type LocalPdfExportPublicState =
  | "accepted"
  | "pending"
  | "processing"
  | "finalizing"
  | "completed"
  | "cancel-requested"
  | "cancelled"
  | "deadline-exceeded"
  | "resource-rejected"
  | "failed"

export interface LocalPdfExportPublicStatus {
  operationId: string
  exportRequestId: string
  artifactId: string
  documentId: string
  documentRevision: number
  state: LocalPdfExportPublicState
  acceptedAt: string
  updatedAt: string
  terminalStatus: "completed" | "cancelled" | "deadline-exceeded" | "resource-rejected" | "failed" | null
  stopReason: string | null
  pageCount: number | null
  byteLength: number | null
}

export interface LocalPdfExportCancelResult {
  operationId: string
  requestedAt: string
  state: "cancel-requested" | "cancelled"
  status: "applied" | "idempotent-replay"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string"
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000")
}

const PUBLIC_STATES = new Set<LocalPdfExportPublicState>([
  "accepted",
  "pending",
  "processing",
  "finalizing",
  "completed",
  "cancel-requested",
  "cancelled",
  "deadline-exceeded",
  "resource-rejected",
  "failed",
])

const TERMINAL_STATES = new Set<NonNullable<LocalPdfExportPublicStatus["terminalStatus"]>>([
  "completed",
  "cancelled",
  "deadline-exceeded",
  "resource-rejected",
  "failed",
])

export function parseLocalPdfExportEligibility(value: unknown): LocalPdfExportEligibility | null {
  if (!isRecord(value) || !isRecord(value.contracts)) return null
  const status = value.status
  const lane = value.lane
  const reason = value.reason
  if (status !== "eligible" && status !== "ineligible" && status !== "stale") return null
  if (lane !== null && lane !== "canonical-evidence") return null
  if (reason !== null && reason !== "unsupported-document" && reason !== "revision-mismatch") return null
  if (
    value.source !== "flowdoc-backend-pdf-export-local-eligibility"
    || value.contractVersion !== 1
    || value.kind !== "pdf-export-local-eligibility"
    || !isNonEmptyString(value.documentId)
    || !isRevision(value.documentRevision)
    || value.contracts.exactDocumentPin !== true
    || value.contracts.requestBodyIdentityFieldsForbidden !== true
    || value.contracts.sameOriginDevelopmentProxyRequired !== true
    || value.contracts.productionBinding !== false
    || !hasExactKeys(value, [
      "source",
      "contractVersion",
      "kind",
      "status",
      "documentId",
      "documentRevision",
      "lane",
      "reason",
      "contracts",
    ])
    || !hasExactKeys(value.contracts, [
      "exactDocumentPin",
      "requestBodyIdentityFieldsForbidden",
      "sameOriginDevelopmentProxyRequired",
      "productionBinding",
    ])
  ) return null
  if (status === "eligible" && (lane !== "canonical-evidence" || reason !== null)) return null
  if (status === "ineligible" && (lane !== null || reason !== "unsupported-document")) return null
  if (status === "stale" && (lane !== null || reason !== "revision-mismatch")) return null
  return value as unknown as LocalPdfExportEligibility
}

export function parseLocalPdfExportPublicStatus(value: unknown): LocalPdfExportPublicStatus | null {
  if (!isRecord(value)) return null
  const state = value.state
  const terminalStatus = value.terminalStatus
  if (typeof state !== "string" || !PUBLIC_STATES.has(state as LocalPdfExportPublicState)) return null
  if (terminalStatus !== null && (
    typeof terminalStatus !== "string"
    || !TERMINAL_STATES.has(terminalStatus as NonNullable<LocalPdfExportPublicStatus["terminalStatus"]>)
  )) return null
  if (
    !isNonEmptyString(value.operationId)
    || !isNonEmptyString(value.exportRequestId)
    || !isNonEmptyString(value.artifactId)
    || !isNonEmptyString(value.documentId)
    || !isRevision(value.documentRevision)
    || !isNonEmptyString(value.acceptedAt)
    || !isNonEmptyString(value.updatedAt)
    || !isNullableString(value.stopReason)
    || value.pageCount !== null && !isRevision(value.pageCount)
    || value.byteLength !== null && !isRevision(value.byteLength)
    || !hasExactKeys(value, [
      "operationId",
      "exportRequestId",
      "artifactId",
      "documentId",
      "documentRevision",
      "state",
      "acceptedAt",
      "updatedAt",
      "terminalStatus",
      "stopReason",
      "pageCount",
      "byteLength",
    ])
  ) return null
  return value as unknown as LocalPdfExportPublicStatus
}

export function parseLocalPdfExportStatusEnvelope(value: unknown): LocalPdfExportPublicStatus | null {
  if (!isRecord(value) || !isRecord(value.export)) return null
  if (!hasExactKeys(value, ["status", "export"])) return null
  if (value.status !== "created" && value.status !== "idempotent-replay" && value.status !== "found") return null
  return parseLocalPdfExportPublicStatus(value.export)
}

export function parseLocalPdfExportCancelResult(value: unknown): LocalPdfExportCancelResult | null {
  if (
    !isRecord(value)
    || !isNonEmptyString(value.operationId)
    || !isNonEmptyString(value.requestedAt)
    || value.status !== "applied" && value.status !== "idempotent-replay"
    || !hasExactKeys(value, ["status", "operationId", "state", "requestedAt"])
  ) return null
  if (value.state !== "cancel-requested" && value.state !== "cancelled") return null
  return {
    operationId: value.operationId,
    requestedAt: value.requestedAt,
    state: value.state,
    status: value.status,
  }
}

export function localPdfExportPinKey(pin: LocalPdfExportDocumentPin): string {
  return `${pin.documentId}\u0000${pin.documentRevision}`
}

export function isLocalPdfExportStatusForPin(
  status: LocalPdfExportPublicStatus,
  pin: LocalPdfExportDocumentPin,
): boolean {
  return status.documentId === pin.documentId && status.documentRevision === pin.documentRevision
}
