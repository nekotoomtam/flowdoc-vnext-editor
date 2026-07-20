import { createVNextPublishedStructureMappingProfileV1 } from "@flowdoc/vnext-core"
import { describe, expect, it } from "vitest"
import {
  createExactPreviewReconnectRecordV1,
  createExactPreviewInputIdentityV1,
  parseExactPreviewReconnectRecordV1,
  parseExactPreviewReconnectTargetV1,
  type ExactPreviewReconnectContext,
} from "../editor/preview/exactPreviewReconnect"
import type { PublishedPreviewAdmissionReceipt } from "../editor/preview/publishedPreviewContracts"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

const hash = (seed: string) => `sha256:${seed.repeat(64).slice(0, 64)}`
const profile = createVNextPublishedStructureMappingProfileV1({
  mappingProfileId: "mapping:e63-reconnect",
  mappingProfileVersion: 1,
  owner: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
  sourceContract: {
    sourceContractId: "source:e63-reconnect",
    sourceContractVersion: 1,
    schemaFingerprint: hash("1"),
  },
  target: {
    dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
    dataContractFingerprint: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
  },
  execution: {
    kind: "named-adapter",
    adapterId: "adapter:e63-reconnect",
    adapterVersion: 1,
    implementationFingerprint: hash("2"),
  },
})

const context: ExactPreviewReconnectContext = {
  contextFingerprint: hash("3"),
  authoring: { documentId: "document:e63", documentRevision: 6 },
  projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
  mappingProfiles: [{ label: "E.6.3 JSON", profile }],
}

function receipt(): PublishedPreviewAdmissionReceipt {
  return {
    admissionId: "admission:e63",
    status: "ready-with-warnings",
    lane: "adapted",
    structure: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
    dataContract: {
      dataContractId: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractId,
      dataContractFingerprint: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.dataContract.dataContractFingerprint,
      publishedStructureFingerprint: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.structureFingerprint,
    },
    instance: {
      contractVersion: 1,
      kind: "document-instance",
      instanceId: "instance:e63",
      revision: 0,
      structureVersion: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE.owner,
    },
    inputFingerprint: hash("4"),
    canonicalInputFingerprint: hash("5"),
    canonicalContentFingerprint: hash("6"),
    mappingProfile: {
      mappingProfileId: profile.mappingProfileId,
      mappingProfileVersion: profile.mappingProfileVersion,
      profileFingerprint: profile.profileFingerprint,
    },
    diagnostics: {
      contentFree: true,
      issues: [],
      warnings: [{ severity: "warning", code: "value-defaulted", path: "document.title", message: "Default used." }],
      summary: {
        errorCount: 0,
        warningCount: 1,
        scalarValueCount: 17,
        collectionSnapshotCount: 1,
        collectionItemCount: 10,
        mediaAssetCount: 7,
        defaultAppliedCount: 1,
      },
      diagnosticsFingerprint: hash("7"),
    },
    execution: {
      mapping: "executed",
      runtimeValidation: "run-valid",
      materialization: "not-run",
      resolution: "not-run",
      measurement: "not-run",
      pagination: "not-run",
      artifact: "not-run",
    },
    contracts: {
      canonicalBusinessDataExposed: false,
      durablePersistence: true,
      rawPayloadRetained: false,
      productionBinding: false,
    },
    receiptFingerprint: hash("8"),
  }
}

function reconnect() {
  return createExactPreviewReconnectRecordV1({
    target: "published",
    context,
    inputIdentity: hash("b"),
    admissionKey: "editor:published:admission:e63",
    exportKey: "editor:published:artifact:e63",
    cancelKey: "editor:published:cancel:e63",
    receipt: receipt(),
    operationId: "operation:e63",
  })
}

describe("PDF-EXPORT-REALDOC-E.6.3 exact preview reconnect record", () => {
  it("accepts only a known reconnect target", () => {
    expect(parseExactPreviewReconnectTargetV1("draft")).toBe("draft")
    expect(parseExactPreviewReconnectTargetV1("published")).toBe("published")
    expect(parseExactPreviewReconnectTargetV1("preview")).toBeNull()
    expect(parseExactPreviewReconnectTargetV1({ target: "published" })).toBeNull()
  })

  it("uses exact input content rather than a resettable revision for stale rejection", () => {
    const first = createExactPreviewInputIdentityV1({
      target: "published",
      context,
      value: { kind: "adapted-json", payloadText: '{"title":"first"}', profileFingerprint: profile.profileFingerprint },
    })
    const changed = createExactPreviewInputIdentityV1({
      target: "published",
      context,
      value: { kind: "adapted-json", payloadText: '{"title":"changed"}', profileFingerprint: profile.profileFingerprint },
    })
    expect(first).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(changed).not.toBe(first)
    expect(first).not.toContain("first")
  })

  it("retains only a strict content-free session record for exact replay", () => {
    const value = reconnect()
    expect(parseExactPreviewReconnectRecordV1(value, { target: "published", context })).toEqual(value)
    expect(value.contracts).toEqual({
      contentFree: true,
      sessionStorageOnly: true,
      formValuesStored: false,
      rawJsonPayloadStored: false,
      canonicalBusinessDataStored: false,
      productionBinding: false,
    })
    const serialized = JSON.stringify(value)
    expect(serialized).not.toContain("payloadText")
    expect(serialized).not.toContain("documentValues")
    expect(serialized).not.toContain('"canonicalInput":')
    expect(serialized).not.toContain("Ward Registry")
  })

  it("fails closed on context, profile, durability, or unknown-key drift", () => {
    const contextDrift = reconnect()
    contextDrift.context.contextFingerprint = hash("9")
    expect(parseExactPreviewReconnectRecordV1(contextDrift, { target: "published", context })).toBeNull()

    const profileDrift = reconnect()
    profileDrift.receipt.mappingProfile!.profileFingerprint = hash("a")
    expect(parseExactPreviewReconnectRecordV1(profileDrift, { target: "published", context })).toBeNull()

    const memoryOnly = reconnect()
    memoryOnly.receipt.contracts.durablePersistence = false
    expect(parseExactPreviewReconnectRecordV1(memoryOnly, { target: "published", context })).toBeNull()

    const leaked = { ...reconnect(), canonicalBusinessData: { title: "private" } }
    expect(parseExactPreviewReconnectRecordV1(leaked, { target: "published", context })).toBeNull()
  })
})
