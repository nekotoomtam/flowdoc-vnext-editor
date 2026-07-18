import {
  FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE,
  parseLocalPdfExportCancelResult,
  parseLocalPdfExportEligibility,
  parseLocalPdfExportStatusEnvelope,
  type LocalPdfExportCancelResult,
  type LocalPdfExportDocumentPin,
  type LocalPdfExportEligibility,
  type LocalPdfExportPublicStatus,
} from "./localPdfExportContracts"

export interface LocalPdfExportFetchResponse {
  blob(): Promise<Blob>
  headers: { get(name: string): string | null }
  json(): Promise<unknown>
  ok: boolean
  status: number
}

export type LocalPdfExportFetch = (
  input: string,
  init?: {
    body?: string
    headers?: Record<string, string>
    method?: string
  },
) => Promise<LocalPdfExportFetchResponse>

export class LocalPdfExportTransportError extends Error {
  readonly statusCode: number | null

  constructor(message: string, statusCode: number | null = null) {
    super(message)
    this.name = "LocalPdfExportTransportError"
    this.statusCode = statusCode
  }
}

export interface LocalPdfExportClient {
  cancelExport(operationId: string, idempotencyKey: string): Promise<LocalPdfExportCancelResult>
  checkEligibility(pin: LocalPdfExportDocumentPin): Promise<LocalPdfExportEligibility>
  downloadExport(operationId: string): Promise<Blob>
  readStatus(operationId: string): Promise<LocalPdfExportPublicStatus>
  requestExport(pin: LocalPdfExportDocumentPin, idempotencyKey: string): Promise<LocalPdfExportPublicStatus>
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "")
}

async function readJson(response: LocalPdfExportFetchResponse): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new LocalPdfExportTransportError("local PDF response was not JSON", response.status)
  }
}

async function requireStatusEnvelope(response: LocalPdfExportFetchResponse): Promise<LocalPdfExportPublicStatus> {
  const body = await readJson(response)
  if (!response.ok) throw new LocalPdfExportTransportError("local PDF request was rejected", response.status)
  const status = parseLocalPdfExportStatusEnvelope(body)
  if (status == null) throw new LocalPdfExportTransportError("local PDF status contract was invalid", response.status)
  return status
}

export function createLocalPdfExportClient(options: {
  baseUrl?: string
  fetchImpl?: LocalPdfExportFetch
} = {}): LocalPdfExportClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE)
  const fetchImpl = options.fetchImpl ?? (fetch as LocalPdfExportFetch)

  return {
    async checkEligibility(pin) {
      const query = new URLSearchParams({
        documentId: pin.documentId,
        documentRevision: String(pin.documentRevision),
      })
      const response = await fetchImpl(`${baseUrl}/eligibility?${query.toString()}`)
      const body = await readJson(response)
      if (!response.ok) throw new LocalPdfExportTransportError("local PDF eligibility was unavailable", response.status)
      const eligibility = parseLocalPdfExportEligibility(body)
      if (eligibility == null) {
        throw new LocalPdfExportTransportError("local PDF eligibility contract was invalid", response.status)
      }
      return eligibility
    },

    async requestExport(pin, idempotencyKey) {
      const response = await fetchImpl(`${baseUrl}/pdf-exports`, {
        body: JSON.stringify(pin),
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        method: "POST",
      })
      return requireStatusEnvelope(response)
    },

    async readStatus(operationId) {
      const response = await fetchImpl(`${baseUrl}/pdf-exports/${encodeURIComponent(operationId)}`)
      return requireStatusEnvelope(response)
    },

    async cancelExport(operationId, idempotencyKey) {
      const response = await fetchImpl(`${baseUrl}/pdf-exports/${encodeURIComponent(operationId)}/cancel`, {
        headers: { "idempotency-key": idempotencyKey },
        method: "POST",
      })
      const body = await readJson(response)
      if (!response.ok) throw new LocalPdfExportTransportError("local PDF cancellation was rejected", response.status)
      const result = parseLocalPdfExportCancelResult(body)
      if (result == null || result.operationId !== operationId) {
        throw new LocalPdfExportTransportError("local PDF cancellation contract was invalid", response.status)
      }
      return result
    },

    async downloadExport(operationId) {
      const response = await fetchImpl(`${baseUrl}/pdf-exports/${encodeURIComponent(operationId)}/download`)
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
      if (!response.ok || contentType !== "application/pdf") {
        throw new LocalPdfExportTransportError("local PDF download was unavailable", response.status)
      }
      const blob = await response.blob()
      if (blob.size === 0) throw new LocalPdfExportTransportError("local PDF download was empty", response.status)
      return blob
    },
  }
}
