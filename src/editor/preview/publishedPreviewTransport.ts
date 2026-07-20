import type { VNextPublishedStructureMappingProfileV1 } from "../../core/coreAdapter"
import { FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE } from "../pdfExport/localPdfExportContracts"
import {
  parsePublishedPreviewAdmissionEnvelope,
  parsePublishedPreviewContextEnvelope,
  type PublishedPreviewAdmissionReceipt,
  type PublishedPreviewContext,
} from "./publishedPreviewContracts"

export interface PublishedPreviewFetchResponse {
  json(): Promise<unknown>
  ok: boolean
  status: number
}

export type PublishedPreviewFetch = (
  input: string,
  init?: { body?: string; headers?: Record<string, string>; method?: string },
) => Promise<PublishedPreviewFetchResponse>

export class PublishedPreviewTransportError extends Error {
  readonly statusCode: number | null

  constructor(message: string, statusCode: number | null = null) {
    super(message)
    this.name = "PublishedPreviewTransportError"
    this.statusCode = statusCode
  }
}

export interface PublishedPreviewClient {
  readContext(pin: { documentId: string; documentRevision: number }): Promise<PublishedPreviewContext>
  admitAdaptedJson(input: {
    context: PublishedPreviewContext
    profile: VNextPublishedStructureMappingProfileV1
    payloadText: string
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
}

function base(value: string): string {
  return value.replace(/\/+$/u, "")
}

export function createPublishedPreviewClient(options: {
  baseUrl?: string
  fetchImpl?: PublishedPreviewFetch
} = {}): PublishedPreviewClient {
  const baseUrl = base(options.baseUrl ?? FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE)
  const fetchImpl = options.fetchImpl ?? (fetch as PublishedPreviewFetch)
  return {
    async readContext(pin) {
      const query = new URLSearchParams({
        documentId: pin.documentId,
        documentRevision: String(pin.documentRevision),
      })
      const response = await fetchImpl(`${baseUrl}/docgen-local/published-preview-context?${query}`)
      const body = await response.json()
      if (!response.ok) throw new PublishedPreviewTransportError("Published Preview context is unavailable", response.status)
      const parsed = parsePublishedPreviewContextEnvelope(body)
      if (parsed == null
        || parsed.authoring.documentId !== pin.documentId
        || parsed.authoring.documentRevision !== pin.documentRevision) {
        throw new PublishedPreviewTransportError("Published Preview context contract is invalid", response.status)
      }
      return parsed
    },

    async admitAdaptedJson(input) {
      const response = await fetchImpl(`${baseUrl}/docgen-local/admissions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          contractVersion: 1,
          kind: "docgen-local-admission-request",
          structure: input.context.admission.structure,
          assets: input.context.admission.assets,
          input: {
            kind: "adapted-json",
            mappingProfile: {
              mappingProfileId: input.profile.mappingProfileId,
              mappingProfileVersion: input.profile.mappingProfileVersion,
            },
            payloadText: input.payloadText,
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new PublishedPreviewTransportError("Published Preview admission was rejected", response.status)
      const parsed = parsePublishedPreviewAdmissionEnvelope(body, input.context, input.profile)
      if (parsed == null) throw new PublishedPreviewTransportError("Published Preview admission contract is invalid", response.status)
      return parsed
    },
  }
}

export function publishedPreviewArtifactUrl(operationId: string, baseUrl = FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE): string {
  return `${base(baseUrl)}/pdf-exports/${encodeURIComponent(operationId)}/download`
}
