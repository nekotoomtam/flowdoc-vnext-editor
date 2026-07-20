import type {
  DataSnapshotV2,
  VNextPublishedStructureMappingProfileV1,
  VNextTableCollectionValueV1,
} from "../../core/coreAdapter"
import { FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE } from "../pdfExport/localPdfExportContracts"
import type { PublishedPreviewAdmissionReceipt } from "./publishedPreviewContracts"
import {
  parseDraftPreviewAdmissionEnvelope,
  parseDraftPreviewContextEnvelope,
  type DraftPreviewContext,
} from "./draftPreviewContracts"
import type { PublishedPreviewFetch } from "./publishedPreviewTransport"
import { PublishedPreviewTransportError } from "./publishedPreviewTransport"

export interface DraftPreviewClient {
  readContext(pin: { documentId: string; documentRevision: number }): Promise<DraftPreviewContext>
  admitAdaptedJson(input: {
    context: DraftPreviewContext
    profile: VNextPublishedStructureMappingProfileV1
    payloadText: string
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
  admitCanonicalForm(input: {
    context: DraftPreviewContext
    data: DataSnapshotV2
    collections: Record<string, VNextTableCollectionValueV1>
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
}

function base(value: string): string {
  return value.replace(/\/+$/u, "")
}

export function createDraftPreviewClient(options: {
  baseUrl?: string
  fetchImpl?: PublishedPreviewFetch
} = {}): DraftPreviewClient {
  const baseUrl = base(options.baseUrl ?? FLOWDOC_LOCAL_PDF_EXPORT_PROXY_BASE)
  const fetchImpl = options.fetchImpl ?? (fetch as PublishedPreviewFetch)
  return {
    async readContext(pin) {
      const query = new URLSearchParams({
        documentId: pin.documentId,
        documentRevision: String(pin.documentRevision),
      })
      const response = await fetchImpl(`${baseUrl}/docgen-local/draft-preview-context?${query}`)
      const body = await response.json()
      if (!response.ok) throw new PublishedPreviewTransportError("Draft Preview context is unavailable", response.status)
      const parsed = parseDraftPreviewContextEnvelope(body)
      if (parsed == null
        || parsed.authoring.documentId !== pin.documentId
        || parsed.authoring.documentRevision !== pin.documentRevision) {
        throw new PublishedPreviewTransportError("Draft Preview context contract is invalid", response.status)
      }
      return parsed
    },
    async admitAdaptedJson(input) {
      const response = await fetchImpl(`${baseUrl}/docgen-local/draft-preview-admissions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          contractVersion: 1,
          kind: "docgen-local-draft-preview-admission-request",
          snapshot: {
            snapshotId: input.context.admission.snapshotId,
            snapshotFingerprint: input.context.admission.snapshotFingerprint,
          },
          input: {
            kind: "adapted-json",
            mappingProfile: {
              mappingProfileId: input.profile.mappingProfileId,
              mappingProfileVersion: input.profile.mappingProfileVersion,
              profileFingerprint: input.profile.profileFingerprint,
            },
            payloadText: input.payloadText,
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new PublishedPreviewTransportError("Draft Preview admission was rejected", response.status)
      const parsed = parseDraftPreviewAdmissionEnvelope(body, input.context, input.profile)
      if (parsed == null) throw new PublishedPreviewTransportError("Draft Preview admission contract is invalid", response.status)
      return parsed.generation
    },
    async admitCanonicalForm(input) {
      const response = await fetchImpl(`${baseUrl}/docgen-local/draft-preview-admissions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        body: JSON.stringify({
          contractVersion: 1,
          kind: "docgen-local-draft-preview-admission-request",
          snapshot: {
            snapshotId: input.context.admission.snapshotId,
            snapshotFingerprint: input.context.admission.snapshotFingerprint,
          },
          input: {
            kind: "canonical-data",
            data: input.data,
            collections: input.collections,
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new PublishedPreviewTransportError("Draft Form admission was rejected", response.status)
      const parsed = parseDraftPreviewAdmissionEnvelope(body, input.context, null)
      if (parsed == null) throw new PublishedPreviewTransportError("Draft Form admission contract is invalid", response.status)
      return parsed.generation
    },
  }
}
