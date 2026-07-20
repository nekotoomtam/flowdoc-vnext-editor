import { describe, expect, it } from "vitest"
import {
  applyTestInputFormCommand,
  createTestInputFormState,
  type TestInputFormCommand,
  type TestInputFormState,
} from "../editor/preview/testInputFormState"
import {
  importTestInputFormCanonicalCandidate,
  parseTestInputFormCanonicalJson,
  projectTestInputFormCanonicalCandidate,
} from "../editor/preview/testInputFormCanonicalCandidate"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

const emptyAssets = { version: 1 as const, images: {} }

function apply(state: TestInputFormState, command: TestInputFormCommand): TestInputFormState {
  const result = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, command)
  if (result.status === "blocked") throw new Error(result.issue.message)
  return result.state
}

describe("PDF-EXPORT-REALDOC-E.5.9 Form canonical candidate", () => {
  it("projects dynamic scalar and collection fields without assigning canonical identity", () => {
    let state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "document-value.set", fieldKey: "documentTitle", value: "Parity report" })
    state = apply(state, { kind: "document-value.set", fieldKey: "totalValue", value: "12.50" })
    state = apply(state, { kind: "document-value.set", fieldKey: "approved", value: true })
    state = apply(state, { kind: "collection.inclusion.set", fieldKey: "entries", included: true })
    state = apply(state, { kind: "collection-item.add", fieldKey: "entries", rowId: "row-1" })
    state = apply(state, {
      kind: "collection-item-key.set", fieldKey: "entries", rowId: "row-1", itemKey: "entry-001",
    })
    state = apply(state, {
      kind: "collection-item-value.set",
      fieldKey: "entries",
      rowId: "row-1",
      itemFieldKey: "description",
      value: "Shared item",
    })
    state = apply(state, {
      kind: "collection-item-value.set",
      fieldKey: "entries",
      rowId: "row-1",
      itemFieldKey: "quantity",
      value: "3",
    })

    const candidate = projectTestInputFormCanonicalCandidate(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      emptyAssets,
    )
    expect(candidate).toMatchObject({
      status: "ready-for-admission",
      data: { values: { documentTitle: "Parity report", totalValue: 12.5, approved: true } },
      collections: {
        entries: {
          collectionFieldKey: "entries",
          items: [{ itemKey: "entry-001", values: { description: "Shared item", quantity: 3 } }],
        },
      },
      contracts: { backendValidationRequired: true, canonicalIdentityAssigned: false, browserResolver: false },
    })
  })

  it("blocks invalid numbers and image selections without an exact trusted digest", () => {
    let state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "document-value.set", fieldKey: "totalValue", value: "not-a-number" })
    state = apply(state, {
      kind: "document-image.set",
      fieldKey: "coverImage",
      selection: {
        selectionId: "selection-1",
        fileName: "cover.png",
        mediaType: "image/png",
        byteLength: 10,
        lastModified: 1,
      },
    })
    const candidate = projectTestInputFormCanonicalCandidate(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      emptyAssets,
    )
    expect(candidate.status).toBe("blocked")
    expect(candidate.issues.map((item) => item.code)).toEqual([
      "form-number-invalid",
      "form-image-not-trusted",
    ])
  })

  it("uses an admitted image asset id only when metadata and digest match", () => {
    const sha256 = "a".repeat(64)
    let state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, {
      kind: "document-image.set",
      fieldKey: "coverImage",
      selection: {
        selectionId: "selection-1",
        fileName: "cover.png",
        mediaType: "image/png",
        byteLength: 10,
        lastModified: 1,
        trustedAssetId: "asset:cover",
        sha256,
      },
    })
    const candidate = projectTestInputFormCanonicalCandidate(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      {
        version: 1,
        images: {
          "asset:cover": {
            id: "asset:cover",
            kind: "image",
            mediaType: "image/png",
            byteLength: 10,
            digest: { algorithm: "sha256", value: sha256 },
            intrinsic: { widthPx: 1, heightPx: 1 },
          },
        },
      },
    )
    expect(candidate).toMatchObject({
      status: "ready-for-admission",
      data: { values: { coverImage: { kind: "image-asset-ref", assetId: "asset:cover" } } },
    })
  })

  it("imports exact canonical-data JSON back into the dynamic Form", () => {
    const current = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const imported = importTestInputFormCanonicalCandidate(
      current,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      emptyAssets,
      {
        kind: "canonical-data",
        data: { version: 2, values: { documentTitle: "Imported", totalValue: 7, approved: false } },
        collections: {
          entries: {
            collectionFieldKey: "entries",
            items: [{ itemKey: "entry-imported", values: { description: "Item", quantity: 2 } }],
          },
        },
      },
    )
    expect(imported.status).toBe("imported")
    if (imported.status !== "imported") throw new Error(imported.issues[0]?.message)
    expect(imported.state).toMatchObject({
      revision: 1,
      dirty: true,
      documentValues: {
        documentTitle: { value: "Imported" },
        totalValue: { value: "7" },
        approved: { value: false },
      },
      collections: {
        entries: {
          included: true,
          items: [{ itemKey: "entry-imported", values: { description: { value: "Item" }, quantity: { value: "2" } } }],
        },
      },
    })
  })

  it("accepts canonical JSON files with a UTF-8 BOM", () => {
    expect(parseTestInputFormCanonicalJson('\ufeff{"kind":"canonical-data"}')).toEqual({
      kind: "canonical-data",
    })
  })
})
