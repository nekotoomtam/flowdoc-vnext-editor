import type { CoreReadTransportEnvelope } from "../../core/coreTypes"
import { inspectCorePackageVersionCapability } from "../../core/coreAdapter"
import {
  createBackendVersionCapabilityResult,
  createUnavailableVersionCapabilityResult,
  type EditorBackendVersionCapabilityResult,
} from "./backendVersionCapability"

export type BackendMutationSource =
  | "canvas"
  | "inspector"
  | "keyboard"
  | "outline"
  | "system"
  | "toolbar"

export type BackendMutationOperation =
  | {
      kind: "node.delete"
      nodeId: string
    }
  | {
      kind: "node.duplicate"
      nodeId: string
    }
  | {
      kind: "node.reorder"
      nodeId: string
      toIndex: number
    }

export interface BackendMutationRequest {
  baseRevision: number
  documentId: string
  operation: BackendMutationOperation
  reason?: string
  requestId: string
  source: BackendMutationSource
}

export interface BackendMigrationRequest {
  baseRevision: number
  documentId: string
  reason?: string
  requestId: string
  source: "editor"
}

export interface BackendMigrationIssue {
  code: string
  message: string
  path: string
  severity: "error" | "warning"
}

export interface BackendMigrationResultEnvelope {
  baseRevision: number
  documentId: string
  idempotency: "new" | "replayed" | null
  issues: BackendMigrationIssue[]
  receivedAt: number
  requestId: string
  requestedAt: number
  revision: number | null
  sourceSnapshot: {
    retainedAt: string
    sourceRevision: number
    targetRevision: number
  } | null
  status: "applied" | "rejected" | "stale"
  summary: {
    changeCount: number
    errorCount: number
    normalizedTextBlockCount: number
    warningCount: number
  } | null
  target: { packageVersion: 3; documentVersion: 4 } | null
}

export interface BackendTransportIssue {
  code: string
  message: string
  path: string
  severity: "error" | "info" | "warning"
}

export interface BackendDocumentReadFoundResponse {
  documentId: string
  packageValue: unknown
  revision: number
  status: "found"
  updatedAt: string
}

export type BackendDocumentReadResult =
  | {
      envelope: CoreReadTransportEnvelope
      response: BackendDocumentReadFoundResponse
      status: "found"
    }
  | {
      issues: BackendTransportIssue[]
      status: "invalid-response" | "not-found" | "unsupported-version"
      statusCode?: number
    }

export interface BackendMutationIssue {
  code: string
  message: string
  nodeId?: string
  path: string
  severity: "error" | "info" | "warning"
}

export interface BackendMutationResultEnvelope {
  baseRevision: number
  core: unknown
  documentId: string
  issues: BackendMutationIssue[]
  operationKind: BackendMutationOperation["kind"]
  readEnvelope?: CoreReadTransportEnvelope
  receivedAt: number
  requestId: string
  requestedAt: number
  revision: number | null
  status: "applied" | "rejected" | "stale"
  targetNodeIds: string[]
}

export interface BackendClientFetchResponse {
  json(): Promise<unknown>
  ok: boolean
  status: number
}

export type BackendClientFetch = (
  input: string,
  init?: {
    body?: string
    headers?: Record<string, string>
    method?: string
  },
) => Promise<BackendClientFetchResponse>

export interface FlowDocBackendClientOptions {
  baseUrl: string
  fetchImpl?: BackendClientFetch
  now?: () => number
}

export interface FlowDocBackendClient {
  commitMutation(request: BackendMutationRequest): Promise<BackendMutationResultEnvelope>
  migrateDocument(request: BackendMigrationRequest): Promise<BackendMigrationResultEnvelope>
  readDocument(documentId: string): Promise<BackendDocumentReadResult>
  readVersionCapabilities(): Promise<EditorBackendVersionCapabilityResult>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function issue(path: string, message: string, code = "invalid-response"): BackendTransportIssue {
  return {
    code,
    message,
    path,
    severity: "error",
  }
}

function hasPackageValue(record: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(record, "packageValue")
    && record.packageValue !== null
    && record.packageValue !== undefined
}

export function createBackendDocumentReadResult(
  value: unknown,
  options: {
    receivedAt: number
    requestedAt: number
    statusCode?: number
  },
): BackendDocumentReadResult {
  if (!isRecord(value)) {
    return {
      issues: [issue("", "backend read response must be an object")],
      status: "invalid-response",
      statusCode: options.statusCode,
    }
  }

  if (value.status === "not-found") {
    return {
      issues: [issue("documentId", "backend document was not found", "document-not-found")],
      status: "not-found",
      statusCode: options.statusCode,
    }
  }

  const documentId = nonEmptyString(value.documentId)
  const revision = isRevision(value.revision) ? value.revision : null
  const updatedAt = nonEmptyString(value.updatedAt)
  const issues: BackendTransportIssue[] = []

  if (value.status !== "found") issues.push(issue("status", "backend read response status must be found"))
  if (!documentId) issues.push(issue("documentId", "backend read response requires documentId"))
  if (revision === null) issues.push(issue("revision", "backend read response requires a non-negative revision"))
  if (!updatedAt) issues.push(issue("updatedAt", "backend read response requires updatedAt"))
  if (!hasPackageValue(value)) issues.push(issue("packageValue", "backend read response requires packageValue"))

  if (issues.length > 0 || !documentId || revision === null || !updatedAt) {
    return {
      issues,
      status: "invalid-response",
      statusCode: options.statusCode,
    }
  }

  const versionInspection = inspectCorePackageVersionCapability(value.packageValue)
  if (versionInspection.status === "invalid-version-markers") {
    return {
      issues: [issue(
        "packageValue",
        "backend package has invalid package/document version markers",
        "invalid-version-markers",
      )],
      status: "unsupported-version",
      statusCode: options.statusCode,
    }
  }
  if (versionInspection.capability.disposition === "unsupported") {
    return {
      issues: [issue(
        "packageValue",
        "backend package version is not supported by the editor runtime",
        "unsupported-version",
      )],
      status: "unsupported-version",
      statusCode: options.statusCode,
    }
  }

  const response: BackendDocumentReadFoundResponse = {
    documentId,
    packageValue: value.packageValue,
    revision,
    status: "found",
    updatedAt,
  }

  return {
    envelope: {
      baseRevision: revision,
      documentId,
      envelopeId: `backend-read:${documentId}:${revision}:${options.receivedAt}`,
      packageValue: response.packageValue,
      purpose: "initial-load",
      receivedAt: options.receivedAt,
      requestedAt: options.requestedAt,
      sourceKind: "api",
      sourceRevision: revision,
    },
    response,
    status: "found",
  }
}

export function createBackendMutationReadEnvelope(
  result: BackendMutationResultEnvelope,
): CoreReadTransportEnvelope | null {
  if (result.status !== "applied" || result.revision === null || !result.readEnvelope) return null

  return {
    ...result.readEnvelope,
    documentId: result.documentId,
    purpose: "mutation-result",
    sourceKind: "mutation-result",
    sourceRevision: result.readEnvelope.sourceRevision ?? result.revision,
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

export function createFlowDocBackendClient(options: FlowDocBackendClientOptions): FlowDocBackendClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => Date.now())

  return {
    async commitMutation(request) {
      const response = await fetchImpl(
        `${baseUrl}/documents/${encodeURIComponent(request.documentId)}/mutations`,
        {
          body: JSON.stringify(request),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      )

      return await response.json() as BackendMutationResultEnvelope
    },

    async migrateDocument(request) {
      const response = await fetchImpl(
        `${baseUrl}/documents/${encodeURIComponent(request.documentId)}/migrations/package-v3-document-v4`,
        {
          body: JSON.stringify(request),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      )

      return await response.json() as BackendMigrationResultEnvelope
    },

    async readDocument(documentId) {
      const requestedAt = now()
      const response = await fetchImpl(`${baseUrl}/documents/${encodeURIComponent(documentId)}`)
      const body = await response.json()
      const receivedAt = now()

      if (!response.ok && response.status === 404) {
        return {
          issues: [issue("documentId", "backend document was not found", "document-not-found")],
          status: "not-found",
          statusCode: response.status,
        }
      }

      return createBackendDocumentReadResult(body, {
        receivedAt,
        requestedAt,
        statusCode: response.status,
      })
    },

    async readVersionCapabilities() {
      const response = await fetchImpl(`${baseUrl}/capabilities/versions`)
      const body = await response.json()
      if (!response.ok) return createUnavailableVersionCapabilityResult(response.status)
      return createBackendVersionCapabilityResult(body, { statusCode: response.status })
    },
  }
}
