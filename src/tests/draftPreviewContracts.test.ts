import { describe, expect, it, vi } from "vitest"
import {
  createVNextDraftStructurePreviewSnapshotV1,
  createVNextPublishedStructureMappingProfileV1,
} from "../core/coreAdapter"
import {
  parseDraftPreviewAdmissionEnvelope,
  parseDraftPreviewContextEnvelope,
  type DraftPreviewContext,
} from "../editor/preview/draftPreviewContracts"
import { createDraftPreviewClient } from "../editor/preview/draftPreviewTransport"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

const hash = (seed: string) => `sha256:${seed.repeat(64).slice(0, 64)}`
const profile = createVNextPublishedStructureMappingProfileV1({
  mappingProfileId: "mapping:qa-draft-json",
  mappingProfileVersion: 1,
  owner: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
  sourceContract: {
    sourceContractId: "source:qa-draft-json",
    sourceContractVersion: 1,
    schemaFingerprint: hash("4"),
  },
  target: {
    dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
    dataContractFingerprint: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
  },
  execution: {
    kind: "named-adapter",
    adapterId: "adapter:qa-draft-json",
    adapterVersion: 1,
    implementationFingerprint: hash("5"),
  },
})
const snapshot = createVNextDraftStructurePreviewSnapshotV1({
  snapshotId: "draft-preview:qa:4",
  draft: {
    contractVersion: 1,
    kind: "structure-definition-draft",
    structureId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner.structureId,
    draftId: "draft:qa",
    revision: 4,
  },
  authoring: { documentId: "document:preview", documentRevision: 4 },
  sourcePackage: {
    packageId: "package:qa",
    packageVersion: 3,
    documentVersion: 4,
    packageFingerprint: hash("a"),
  },
})

function contextEnvelope() {
  return {
    status: "ready",
    context: {
      source: "flowdoc-backend-docgen-local-draft-preview",
      contractVersion: 1,
      kind: "docgen-local-draft-preview-context",
      status: "ready",
      authoring: snapshot.authoring,
      target: { kind: "draft-preview", snapshot },
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      mappingProfiles: [{ label: "Draft JSON", profile }],
      admission: {
        contractVersion: 1,
        kind: "docgen-local-draft-preview-admission-template",
        snapshotId: snapshot.snapshotId,
        snapshotFingerprint: snapshot.snapshotFingerprint,
        assets: { version: 1, images: {} },
      },
      executionBridge: {
        kind: "published-generation-compatibility-bridge",
        structure: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
        sharedGenerationValidation: true,
        sharedArtifactLifecycle: true,
        publishedApiParity: false,
      },
      limits: { adaptedPayloadMaxUtf8Bytes: 1024 * 1024 },
      contracts: {
        trustedBackendSnapshot: true,
        exactDraftRevision: true,
        immutableDraftSnapshot: true,
        separateDraftAdmission: true,
        businessValuesIncluded: false,
        rawPayloadIncluded: false,
        executableMapperIncluded: false,
        publishedStructureVersion: false,
        publishedApiParity: false,
        productionBinding: false,
      },
      contextFingerprint: hash("b"),
    },
  }
}

function generationReceipt(context: DraftPreviewContext) {
  return {
    source: "flowdoc-backend-docgen-local-admission",
    contractVersion: 1,
    kind: "docgen-local-admission-receipt",
    admissionId: "admission:draft-preview",
    status: "ready-with-warnings",
    lane: "adapted",
    scope: { tenantId: "tenant:qa", principalId: "principal:qa" },
    structure: context.projection.owner,
    dataContract: {
      dataContractId: context.projection.dataContract.dataContractId,
      dataContractFingerprint: context.projection.dataContract.dataContractFingerprint,
      publishedStructureFingerprint: context.projection.structureFingerprint,
    },
    instance: {
      contractVersion: 1,
      kind: "document-instance",
      instanceId: "instance:draft-preview",
      revision: 0,
      structureVersion: context.projection.owner,
    },
    inputFingerprint: hash("c"),
    canonicalInputFingerprint: hash("d"),
    mappingProfile: {
      mappingProfileId: profile.mappingProfileId,
      mappingProfileVersion: profile.mappingProfileVersion,
      profileFingerprint: profile.profileFingerprint,
    },
    assets: { registryFingerprint: hash("e"), assetCount: 0, verifiedByteCount: 0 },
    diagnostics: {
      contentFree: true,
      issues: [], warnings: [],
      summary: {
        errorCount: 0, warningCount: 0, scalarValueCount: 1, collectionSnapshotCount: 0,
        collectionItemCount: 0, mediaAssetCount: 0, defaultAppliedCount: 0,
      },
      diagnosticsFingerprint: hash("f"),
    },
    nextStep: "materialization",
    execution: {
      mapping: "executed", runtimeValidation: "run-valid", materialization: "not-run",
      resolution: "not-run", measurement: "not-run", pagination: "not-run", artifact: "not-run",
    },
    contracts: {
      backendOwnedInstance: true, exactPublishedStructureVersion: true, trustedMapperOnly: true,
      exactAssetBytesVerified: true, rawPayloadRetained: false, canonicalBusinessDataExposed: false,
      durablePersistence: false, workerEnqueued: false, productionBinding: false,
    },
    receiptFingerprint: hash("1"),
  }
}

function admissionEnvelope(context: DraftPreviewContext) {
  return {
    status: "created",
    admission: {
      source: "flowdoc-backend-docgen-local-draft-preview",
      contractVersion: 1,
      kind: "docgen-local-draft-preview-admission-receipt",
      status: "ready-with-warnings",
      draftSnapshot: snapshot,
      generation: generationReceipt(context),
      contracts: {
        exactDraftSnapshot: true,
        separateDraftAdmission: true,
        sharedGenerationValidation: true,
        sharedArtifactLifecycle: true,
        canonicalBusinessDataExposed: false,
        rawPayloadRetained: false,
        publishedApiParity: false,
        productionBinding: false,
      },
      receiptFingerprint: hash("2"),
    },
  }
}

describe("PDF-EXPORT-REALDOC-E.5.7 Draft Preview contracts", () => {
  it("accepts only an exact immutable draft snapshot with explicit non-Published contracts", () => {
    const parsed = parseDraftPreviewContextEnvelope(contextEnvelope())
    expect(parsed).toMatchObject({
      target: { kind: "draft-preview", snapshot: { draft: { revision: 4 } } },
      contracts: { separateDraftAdmission: true, publishedApiParity: false, productionBinding: false },
    })
    const stale = contextEnvelope()
    stale.context.authoring = { ...stale.context.authoring, documentRevision: 3 }
    expect(parseDraftPreviewContextEnvelope(stale)).toBeNull()
    const masquerading = contextEnvelope()
    masquerading.context.contracts.publishedStructureVersion = true
    expect(parseDraftPreviewContextEnvelope(masquerading)).toBeNull()
  })

  it("unwraps only the content-free shared generation receipt pinned to the same draft", () => {
    const context = parseDraftPreviewContextEnvelope(contextEnvelope())!
    expect(parseDraftPreviewAdmissionEnvelope(admissionEnvelope(context), context, profile)).toMatchObject({
      draftSnapshot: { snapshotId: snapshot.snapshotId },
      generation: { execution: { mapping: "executed", runtimeValidation: "run-valid" } },
      contracts: { sharedArtifactLifecycle: true, publishedApiParity: false },
    })
    const leaked = admissionEnvelope(context)
    Object.assign(leaked.admission.generation, { canonicalBusinessData: { secret: true } })
    expect(parseDraftPreviewAdmissionEnvelope(leaked, context, profile)).toBeNull()
  })

  it("submits snapshot identity to the separate Draft route without caller-owned Structure identity", async () => {
    const context = parseDraftPreviewContextEnvelope(contextEnvelope())!
    const calls: Array<{ url: string; init?: { body?: string; headers?: Record<string, string>; method?: string } }> = []
    const client = createDraftPreviewClient({
      baseUrl: "/local",
      fetchImpl: vi.fn(async (url, init) => {
        calls.push({ url, init })
        return { ok: true, status: 202, json: async () => admissionEnvelope(context) }
      }),
    })
    await client.admitAdaptedJson({
      context, profile, payloadText: "{\"records\":[]}", idempotencyKey: "editor:draft-preview:1",
    })
    const body = JSON.parse(calls[0]!.init!.body!)
    expect(calls[0]).toMatchObject({
      url: "/local/docgen-local/draft-preview-admissions",
      init: { method: "POST", headers: { "idempotency-key": "editor:draft-preview:1" } },
    })
    expect(body).toMatchObject({
      kind: "docgen-local-draft-preview-admission-request",
      snapshot: { snapshotId: snapshot.snapshotId, snapshotFingerprint: snapshot.snapshotFingerprint },
      input: { mappingProfile: { profileFingerprint: profile.profileFingerprint } },
    })
    expect(body).not.toHaveProperty("structure")
    expect(JSON.stringify(body)).not.toContain("implementationFingerprint")
  })
})
