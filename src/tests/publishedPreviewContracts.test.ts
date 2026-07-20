import { describe, expect, it, vi } from "vitest"
import { createVNextPublishedStructureMappingProfileV1 } from "@flowdoc/vnext-core"
import {
  parsePublishedPreviewAdmissionEnvelope,
  parsePublishedPreviewContextEnvelope,
  type PublishedPreviewContext,
} from "../editor/preview/publishedPreviewContracts"
import { createPublishedPreviewClient } from "../editor/preview/publishedPreviewTransport"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

const hash = (seed: string) => `sha256:${seed.repeat(64).slice(0, 64)}`
const previewMappingProfile = createVNextPublishedStructureMappingProfileV1({
  mappingProfileId: "mapping:qa-requirements-json",
  mappingProfileVersion: 1,
  owner: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
  sourceContract: {
    sourceContractId: "source:qa-requirements-json",
    sourceContractVersion: 1,
    schemaFingerprint: hash("4"),
  },
  target: {
    dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
    dataContractFingerprint:
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
  },
  execution: {
    kind: "named-adapter",
    adapterId: "adapter:qa-requirements-json",
    adapterVersion: 1,
    implementationFingerprint: hash("5"),
  },
})

function contextEnvelope() {
  return {
    status: "ready",
    context: {
      source: "flowdoc-backend-docgen-local-published-preview",
      contractVersion: 1,
      kind: "docgen-local-published-preview-context",
      status: "ready",
      authoring: { documentId: "document:preview", documentRevision: 4 },
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      mappingProfiles: [{ label: "Requirements JSON", profile: previewMappingProfile }],
      admission: {
        contractVersion: 1,
        kind: "docgen-local-admission-template",
        structure: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
        assets: { version: 1, images: {} },
      },
      limits: { adaptedPayloadMaxUtf8Bytes: 1024 * 1024 },
      contracts: {
        trustedBackendProjection: true,
        trustedBackendProfiles: true,
        exactPublishedStructureVersion: true,
        businessValuesIncluded: false,
        rawPayloadIncluded: false,
        executableMapperIncluded: false,
        productionBinding: false,
      },
      contextFingerprint: hash("b"),
    },
  }
}

function admissionEnvelope(context: PublishedPreviewContext, lane: "direct" | "adapted" = "adapted") {
  const profile = context.mappingProfiles[0]!.profile
  return {
    status: "created",
    admission: {
      source: "flowdoc-backend-docgen-local-admission",
      contractVersion: 1,
      kind: "docgen-local-admission-receipt",
      admissionId: "admission:preview",
      status: "ready-with-warnings",
      lane,
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
        instanceId: "instance:preview",
        revision: 0,
        structureVersion: context.projection.owner,
      },
      inputFingerprint: hash("c"),
      canonicalInputFingerprint: hash("d"),
      canonicalContentFingerprint: hash("9"),
      mappingProfile: lane === "adapted" ? {
        mappingProfileId: profile.mappingProfileId,
        mappingProfileVersion: profile.mappingProfileVersion,
        profileFingerprint: profile.profileFingerprint,
      } : null,
      assets: {
        registryFingerprint: hash("a"),
        assetCount: 0,
        verifiedByteCount: 0,
      },
      diagnostics: {
        contentFree: true,
        issues: [],
        warnings: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          scalarValueCount: 1,
          collectionSnapshotCount: 1,
          collectionItemCount: 2,
          mediaAssetCount: 0,
          defaultAppliedCount: 0,
        },
        diagnosticsFingerprint: hash("e"),
      },
      nextStep: "materialization",
      execution: {
        mapping: lane === "adapted" ? "executed" : "not-required",
        runtimeValidation: "run-valid",
        materialization: "not-run",
        resolution: "not-run",
        measurement: "not-run",
        pagination: "not-run",
        artifact: "not-run",
      },
      contracts: {
        backendOwnedInstance: true,
        exactPublishedStructureVersion: true,
        trustedMapperOnly: true,
        exactAssetBytesVerified: true,
        canonicalBusinessDataExposed: false,
        rawPayloadRetained: false,
        durablePersistence: false,
        workerEnqueued: false,
        productionBinding: false,
      },
      receiptFingerprint: hash("f"),
    },
  }
}

describe("PDF-EXPORT-REALDOC-E.5.6 Published Preview contracts", () => {
  it("accepts an exact value-free context and fails closed on owner or privacy drift", () => {
    const parsed = parsePublishedPreviewContextEnvelope(contextEnvelope())
    expect(parsed).not.toBeNull()
    expect(parsed).toMatchObject({
      authoring: { documentId: "document:preview", documentRevision: 4 },
      contracts: { businessValuesIncluded: false, executableMapperIncluded: false },
    })

    const ownerDrift = contextEnvelope()
    ownerDrift.context.admission.structure = {
      ...ownerDrift.context.admission.structure,
      structureVersionId: "structure-version:drifted",
    }
    expect(parsePublishedPreviewContextEnvelope(ownerDrift)).toBeNull()
    const privacyDrift = contextEnvelope()
    privacyDrift.context.contracts.businessValuesIncluded = true
    expect(parsePublishedPreviewContextEnvelope(privacyDrift)).toBeNull()
  })

  it("accepts only content-free adapted receipts pinned to the selected exact profile", () => {
    const context = parsePublishedPreviewContextEnvelope(contextEnvelope())!
    const profile = context.mappingProfiles[0]!.profile
    expect(parsePublishedPreviewAdmissionEnvelope(admissionEnvelope(context), context, profile)).toMatchObject({
      lane: "adapted",
      execution: { mapping: "executed", runtimeValidation: "run-valid" },
      contracts: { canonicalBusinessDataExposed: false, rawPayloadRetained: false },
    })
    const leaked = admissionEnvelope(context)
    leaked.admission.contracts.canonicalBusinessDataExposed = true
    expect(parsePublishedPreviewAdmissionEnvelope(leaked, context, profile)).toBeNull()
    const hiddenValues = admissionEnvelope(context)
    Object.assign(hiddenValues.admission, { canonicalBusinessData: { secret: "must-not-cross" } })
    expect(parsePublishedPreviewAdmissionEnvelope(hiddenValues, context, profile)).toBeNull()
  })

  it("sends the exact context template and selected profile to E.3 without browser mapper code", async () => {
    const context = parsePublishedPreviewContextEnvelope(contextEnvelope())!
    const profile = context.mappingProfiles[0]!.profile
    const calls: Array<{ url: string; init?: { body?: string; headers?: Record<string, string>; method?: string } }> = []
    const client = createPublishedPreviewClient({
      baseUrl: "/local",
      fetchImpl: vi.fn(async (url, init) => {
        calls.push({ url, init })
        return {
          ok: true,
          status: 202,
          json: async () => admissionEnvelope(context),
        }
      }),
    })
    await client.admitAdaptedJson({
      context,
      profile,
      payloadText: "{\"records\":[]}",
      idempotencyKey: "editor:preview:1",
    })
    const body = JSON.parse(calls[0]!.init!.body!)
    expect(calls[0]).toMatchObject({
      url: "/local/docgen-local/admissions",
      init: { method: "POST", headers: { "idempotency-key": "editor:preview:1" } },
    })
    expect(body).toMatchObject({
      structure: context.admission.structure,
      assets: context.admission.assets,
      input: {
        kind: "adapted-json",
        payloadText: "{\"records\":[]}",
        mappingProfile: {
          mappingProfileId: profile.mappingProfileId,
          mappingProfileVersion: profile.mappingProfileVersion,
        },
      },
    })
    expect(JSON.stringify(body)).not.toContain("implementationFingerprint")
  })

  it("submits Form values as direct canonical candidates and accepts only a direct receipt", async () => {
    const context = parsePublishedPreviewContextEnvelope(contextEnvelope())!
    const calls: Array<{ url: string; init?: { body?: string; headers?: Record<string, string>; method?: string } }> = []
    const client = createPublishedPreviewClient({
      baseUrl: "/local",
      fetchImpl: vi.fn(async (url, init) => {
        calls.push({ url, init })
        return { ok: true, status: 202, json: async () => admissionEnvelope(context, "direct") }
      }),
    })
    const receipt = await client.admitCanonicalForm({
      context,
      data: { version: 2, values: { title: "Form value" } },
      collections: {},
      idempotencyKey: "editor:preview:form:1",
    })
    const body = JSON.parse(calls[0]!.init!.body!)
    expect(body).toMatchObject({
      structure: context.admission.structure,
      assets: context.admission.assets,
      input: { kind: "canonical-data", data: { values: { title: "Form value" } }, collections: {} },
    })
    expect(receipt).toMatchObject({
      lane: "direct",
      mappingProfile: null,
      execution: { mapping: "not-required", runtimeValidation: "run-valid" },
    })
  })
})
