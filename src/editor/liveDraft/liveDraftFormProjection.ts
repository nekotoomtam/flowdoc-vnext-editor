import { createVNextCompactFingerprint } from "../../core/coreAdapter"
import type { TestInputFormCanonicalCandidate } from "../preview/testInputFormCanonicalCandidate"
import type { TestInputFormState } from "../preview/testInputFormState"

export const FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION = "live-draft-form-projection-xr3-v1" as const
export const FLOWDOC_LIVE_DRAFT_FORM_MAX_TEXT_LENGTH = 10_000

export interface FlowDocLiveDraftFormProjectionInputV1 {
  documentId: string
  structureRevision: number
  fieldKey: string
  formState: TestInputFormState | null
  candidate: TestInputFormCanonicalCandidate | null
}

export type FlowDocLiveDraftFormProjectionResultV1 =
  | {
      contractVersion: typeof FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION
      status: "ready"
      documentId: string
      structureRevision: number
      formRevision: number
      fieldKey: string
      text: string
      draftSnapshotFingerprint: string
      canonicalFormCandidateFingerprint: string
      contracts: {
        selectedScalarOnly: true
        wholeDocumentResolution: false
        backendAdmission: false
        storage: "memory-only"
      }
    }
  | {
      contractVersion: typeof FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION
      status: "not-ready" | "blocked"
      formRevision: number | null
      reason: string
      contracts: {
        selectedScalarOnly: true
        wholeDocumentResolution: false
        backendAdmission: false
        storage: "memory-only"
      }
    }

const contracts = {
  selectedScalarOnly: true as const,
  wholeDocumentResolution: false as const,
  backendAdmission: false as const,
  storage: "memory-only" as const,
}

export function projectFlowDocLiveDraftFormCandidateV1(
  input: FlowDocLiveDraftFormProjectionInputV1,
): FlowDocLiveDraftFormProjectionResultV1 {
  if (input.formState == null || input.candidate == null) return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "not-ready",
    formRevision: input.formState?.revision ?? null,
    reason: "Form state or canonical candidate is unavailable.",
    contracts,
  }
  if (input.candidate.status !== "ready-for-admission") return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "blocked",
    formRevision: input.formState.revision,
    reason: input.candidate.issues[0]?.message ?? "Form candidate is blocked.",
    contracts,
  }
  const value = input.candidate.data.values[input.fieldKey]
  if (value == null || value === "") return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "not-ready",
    formRevision: input.formState.revision,
    reason: `Enter ${input.fieldKey} to start the bounded Live Draft.`,
    contracts,
  }
  if (typeof value !== "string") return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "blocked",
    formRevision: input.formState.revision,
    reason: `The bounded Live Draft field ${input.fieldKey} must be text.`,
    contracts,
  }
  if (value.length > FLOWDOC_LIVE_DRAFT_FORM_MAX_TEXT_LENGTH) return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "blocked",
    formRevision: input.formState.revision,
    reason: `The bounded Live Draft text exceeds ${FLOWDOC_LIVE_DRAFT_FORM_MAX_TEXT_LENGTH} UTF-16 units.`,
    contracts,
  }

  const canonicalFormCandidateFingerprint = createVNextCompactFingerprint(JSON.stringify({
    kind: input.candidate.kind,
    status: input.candidate.status,
    data: input.candidate.data,
    collections: input.candidate.collections,
  }))
  const draftSnapshotFingerprint = createVNextCompactFingerprint(JSON.stringify({
    documentId: input.documentId,
    structureRevision: input.structureRevision,
    projectionPins: input.formState.projectionPins,
    formRevision: input.formState.revision,
  }))
  return {
    contractVersion: FLOWDOC_LIVE_DRAFT_FORM_PROJECTION_VERSION,
    status: "ready",
    documentId: input.documentId,
    structureRevision: input.structureRevision,
    formRevision: input.formState.revision,
    fieldKey: input.fieldKey,
    text: value,
    draftSnapshotFingerprint,
    canonicalFormCandidateFingerprint,
    contracts,
  }
}
