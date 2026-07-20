import {
  ImageAssetRegistryV1Schema,
  VNextDraftStructurePreviewSnapshotV1Schema,
  type ImageAssetRegistryV1,
  type VNextDraftStructurePreviewSnapshotV1,
  type VNextPublishedStructureMappingProfileV1,
  type VNextPublishedStructureTestInputProjectionV1,
} from "../../core/coreAdapter"
import type { LocalPdfExportDocumentPin } from "../pdfExport/localPdfExportContracts"
import {
  parsePublishedPreviewAdmissionEnvelope,
  parsePublishedPreviewContextEnvelope,
  type PublishedPreviewAdmissionReceipt,
  type PublishedPreviewContext,
  type PublishedPreviewMappingOption,
} from "./publishedPreviewContracts"

const SHA256 = /^sha256:[a-f0-9]{64}$/u

export interface DraftPreviewContext {
  source: "flowdoc-backend-docgen-local-draft-preview"
  contractVersion: 1
  kind: "docgen-local-draft-preview-context"
  status: "ready"
  authoring: LocalPdfExportDocumentPin
  target: { kind: "draft-preview"; snapshot: VNextDraftStructurePreviewSnapshotV1 }
  projection: VNextPublishedStructureTestInputProjectionV1
  mappingProfiles: PublishedPreviewMappingOption[]
  admission: {
    contractVersion: 1
    kind: "docgen-local-draft-preview-admission-template"
    snapshotId: string
    snapshotFingerprint: string
    assets: ImageAssetRegistryV1
  }
  executionBridge: {
    kind: "published-generation-compatibility-bridge"
    structure: VNextPublishedStructureTestInputProjectionV1["owner"]
    sharedGenerationValidation: true
    sharedArtifactLifecycle: true
    publishedApiParity: false
  }
  limits: { adaptedPayloadMaxUtf8Bytes: number }
  contracts: {
    trustedBackendSnapshot: true
    exactDraftRevision: true
    immutableDraftSnapshot: true
    separateDraftAdmission: true
    businessValuesIncluded: false
    rawPayloadIncluded: false
    executableMapperIncluded: false
    publishedStructureVersion: false
    publishedApiParity: false
    productionBinding: false
  }
  contextFingerprint: string
}

export interface DraftPreviewAdmissionReceipt {
  draftSnapshot: VNextDraftStructurePreviewSnapshotV1
  generation: PublishedPreviewAdmissionReceipt
  contracts: {
    exactDraftSnapshot: true
    separateDraftAdmission: true
    sharedGenerationValidation: true
    sharedArtifactLifecycle: true
    canonicalBusinessDataExposed: false
    rawPayloadRetained: false
    publishedApiParity: false
    productionBinding: false
  }
  receiptFingerprint: string
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function bounded(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 512
}

function revision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function sameOwner(left: unknown, right: VNextPublishedStructureTestInputProjectionV1["owner"]): boolean {
  return record(left)
    && exactKeys(left, ["structureId", "structureVersionId", "versionOrdinal"])
    && left.structureId === right.structureId
    && left.structureVersionId === right.structureVersionId
    && left.versionOrdinal === right.versionOrdinal
}

function publishedCompatibilityContext(context: Record<string, unknown>): PublishedPreviewContext | null {
  if (!record(context.executionBridge) || !record(context.admission)) return null
  return parsePublishedPreviewContextEnvelope({
    status: "ready",
    context: {
      source: "flowdoc-backend-docgen-local-published-preview",
      contractVersion: 1,
      kind: "docgen-local-published-preview-context",
      status: "ready",
      authoring: context.authoring,
      projection: context.projection,
      mappingProfiles: context.mappingProfiles,
      admission: {
        contractVersion: 1,
        kind: "docgen-local-admission-template",
        structure: context.executionBridge.structure,
        assets: context.admission.assets,
      },
      limits: context.limits,
      contracts: {
        trustedBackendProjection: true,
        trustedBackendProfiles: true,
        exactPublishedStructureVersion: true,
        businessValuesIncluded: false,
        rawPayloadIncluded: false,
        executableMapperIncluded: false,
        productionBinding: false,
      },
      contextFingerprint: context.contextFingerprint,
    },
  })
}

export function parseDraftPreviewContextEnvelope(value: unknown): DraftPreviewContext | null {
  if (!record(value) || !exactKeys(value, ["status", "context"]) || value.status !== "ready" || !record(value.context)) return null
  const context = value.context
  if (!exactKeys(context, [
    "source", "contractVersion", "kind", "status", "authoring", "target", "projection", "mappingProfiles",
    "admission", "executionBridge", "limits", "contracts", "contextFingerprint",
  ])
    || context.source !== "flowdoc-backend-docgen-local-draft-preview"
    || context.contractVersion !== 1
    || context.kind !== "docgen-local-draft-preview-context"
    || context.status !== "ready"
    || !SHA256.test(String(context.contextFingerprint))
    || !record(context.authoring)
    || !exactKeys(context.authoring, ["documentId", "documentRevision"])
    || !bounded(context.authoring.documentId)
    || !revision(context.authoring.documentRevision)
    || !record(context.target)
    || !exactKeys(context.target, ["kind", "snapshot"])
    || context.target.kind !== "draft-preview") return null
  const snapshot = VNextDraftStructurePreviewSnapshotV1Schema.safeParse(context.target.snapshot)
  if (!snapshot.success
    || snapshot.data.authoring.documentId !== context.authoring.documentId
    || snapshot.data.authoring.documentRevision !== context.authoring.documentRevision
    || !record(context.executionBridge)
    || !exactKeys(context.executionBridge, [
      "kind", "structure", "sharedGenerationValidation", "sharedArtifactLifecycle", "publishedApiParity",
    ])
    || context.executionBridge.kind !== "published-generation-compatibility-bridge"
    || context.executionBridge.sharedGenerationValidation !== true
    || context.executionBridge.sharedArtifactLifecycle !== true
    || context.executionBridge.publishedApiParity !== false
    || !record(context.admission)
    || !exactKeys(context.admission, [
      "contractVersion", "kind", "snapshotId", "snapshotFingerprint", "assets",
    ])
    || context.admission.contractVersion !== 1
    || context.admission.kind !== "docgen-local-draft-preview-admission-template"
    || context.admission.snapshotId !== snapshot.data.snapshotId
    || context.admission.snapshotFingerprint !== snapshot.data.snapshotFingerprint
    || !ImageAssetRegistryV1Schema.safeParse(context.admission.assets).success
    || !record(context.contracts)
    || !exactKeys(context.contracts, [
      "trustedBackendSnapshot", "exactDraftRevision", "immutableDraftSnapshot", "separateDraftAdmission",
      "businessValuesIncluded", "rawPayloadIncluded", "executableMapperIncluded", "publishedStructureVersion",
      "publishedApiParity", "productionBinding",
    ])
    || context.contracts.trustedBackendSnapshot !== true
    || context.contracts.exactDraftRevision !== true
    || context.contracts.immutableDraftSnapshot !== true
    || context.contracts.separateDraftAdmission !== true
    || context.contracts.businessValuesIncluded !== false
    || context.contracts.rawPayloadIncluded !== false
    || context.contracts.executableMapperIncluded !== false
    || context.contracts.publishedStructureVersion !== false
    || context.contracts.publishedApiParity !== false
    || context.contracts.productionBinding !== false) return null
  const compatibility = publishedCompatibilityContext(context)
  if (compatibility == null
    || !sameOwner(context.executionBridge.structure, compatibility.projection.owner)
    || snapshot.data.draft.structureId !== compatibility.projection.owner.structureId) return null
  return {
    ...(context as unknown as DraftPreviewContext),
    target: { kind: "draft-preview", snapshot: snapshot.data },
    projection: compatibility.projection,
    mappingProfiles: compatibility.mappingProfiles,
    admission: {
      contractVersion: 1,
      kind: "docgen-local-draft-preview-admission-template",
      snapshotId: snapshot.data.snapshotId,
      snapshotFingerprint: snapshot.data.snapshotFingerprint,
      assets: compatibility.admission.assets,
    },
  }
}

export function parseDraftPreviewAdmissionEnvelope(
  value: unknown,
  context: DraftPreviewContext,
  selectedProfile: VNextPublishedStructureMappingProfileV1,
): DraftPreviewAdmissionReceipt | null {
  if (!record(value)
    || !exactKeys(value, ["status", "admission"])
    || (value.status !== "created" && value.status !== "replayed")
    || !record(value.admission)) return null
  const receipt = value.admission
  if (!exactKeys(receipt, [
    "source", "contractVersion", "kind", "status", "draftSnapshot", "generation", "contracts", "receiptFingerprint",
  ])
    || receipt.source !== "flowdoc-backend-docgen-local-draft-preview"
    || receipt.contractVersion !== 1
    || receipt.kind !== "docgen-local-draft-preview-admission-receipt"
    || (receipt.status !== "ready" && receipt.status !== "ready-with-warnings")
    || !SHA256.test(String(receipt.receiptFingerprint))) return null
  const snapshot = VNextDraftStructurePreviewSnapshotV1Schema.safeParse(receipt.draftSnapshot)
  if (!snapshot.success
    || snapshot.data.snapshotId !== context.target.snapshot.snapshotId
    || snapshot.data.snapshotFingerprint !== context.target.snapshot.snapshotFingerprint
    || !record(receipt.contracts)
    || !exactKeys(receipt.contracts, [
      "exactDraftSnapshot", "separateDraftAdmission", "sharedGenerationValidation", "sharedArtifactLifecycle",
      "canonicalBusinessDataExposed", "rawPayloadRetained", "publishedApiParity", "productionBinding",
    ])
    || receipt.contracts.exactDraftSnapshot !== true
    || receipt.contracts.separateDraftAdmission !== true
    || receipt.contracts.sharedGenerationValidation !== true
    || receipt.contracts.sharedArtifactLifecycle !== true
    || receipt.contracts.canonicalBusinessDataExposed !== false
    || receipt.contracts.rawPayloadRetained !== false
    || receipt.contracts.publishedApiParity !== false
    || receipt.contracts.productionBinding !== false) return null
  const compatibility = publishedCompatibilityContext(context as unknown as Record<string, unknown>)
  if (compatibility == null) return null
  const generation = parsePublishedPreviewAdmissionEnvelope({
    status: value.status,
    admission: receipt.generation,
  }, compatibility, selectedProfile)
  if (generation == null || generation.status !== receipt.status) return null
  return {
    draftSnapshot: snapshot.data,
    generation,
    contracts: receipt.contracts as DraftPreviewAdmissionReceipt["contracts"],
    receiptFingerprint: receipt.receiptFingerprint as string,
  }
}
