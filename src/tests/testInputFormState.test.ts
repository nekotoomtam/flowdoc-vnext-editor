import { describe, expect, it } from "vitest"
import {
  REALDOC_E54_MAX_COLLECTION_ITEMS,
  applyTestInputFormCommand,
  createTestInputFormState,
  reconcileTestInputFormState,
  type TestInputFormCommand,
  type TestInputFormState,
  type TestInputImageSelection,
} from "../editor/preview/testInputFormState"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

function apply(state: TestInputFormState, command: TestInputFormCommand): TestInputFormState {
  const result = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, command)
  expect(result.status).toBe("applied")
  return result.state
}

const pngSelection: TestInputImageSelection = {
  selectionId: "selection-1",
  fileName: "cover.png",
  mediaType: "image/png",
  byteLength: 256,
  lastModified: 1,
}

describe("PDF-EXPORT-REALDOC-E.5.4 temporary Form state", () => {
  it("creates one unset document value per non-collection field key", () => {
    const state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)

    expect(Object.keys(state.documentValues)).toEqual([
      "documentTitle",
      "reportDate",
      "totalValue",
      "approved",
      "category",
      "coverImage",
      "internalNote",
    ])
    expect(Object.values(state.documentValues).every((entry) => entry.value == null)).toBe(true)
    expect(state.collections.entries).toEqual({ included: false, items: [] })
    expect(state.storage).toBe("memory-only")
    expect(state.execution).toEqual({
      snapshotCreation: "not-run",
      validation: "not-run",
      materialization: "not-run",
      artifact: "not-run",
    })
  })

  it("retains editable scalar drafts without mutating the prior revision", () => {
    const initial = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const withText = apply(initial, {
      kind: "document-value.set",
      fieldKey: "documentTitle",
      value: "Quarterly review",
    })
    const withNumberDraft = apply(withText, {
      kind: "document-value.set",
      fieldKey: "totalValue",
      value: "12.",
    })
    const withBoolean = apply(withNumberDraft, {
      kind: "document-value.set",
      fieldKey: "approved",
      value: false,
    })

    expect(initial.documentValues.documentTitle?.value).toBeNull()
    expect(withBoolean.documentValues.documentTitle?.value).toBe("Quarterly review")
    expect(withBoolean.documentValues.totalValue?.value).toBe("12.")
    expect(withBoolean.documentValues.approved?.value).toBe(false)
    expect(withBoolean.revision).toBe(3)
    expect(withBoolean.dirty).toBe(true)
  })

  it("blocks wrong scalar kinds and accepts only bounded PNG or JPEG selections", () => {
    const initial = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const wrongType = applyTestInputFormCommand(initial, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "document-value.set",
      fieldKey: "approved",
      value: "true",
    })
    const wrongImageType = applyTestInputFormCommand(initial, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "document-image.set",
      fieldKey: "coverImage",
      selection: { ...pngSelection, mediaType: "image/gif" as "image/png" },
    })
    const withImage = apply(initial, {
      kind: "document-image.set",
      fieldKey: "coverImage",
      selection: pngSelection,
    })

    expect(wrongType).toMatchObject({ status: "blocked", issue: { code: "value-type-mismatch" } })
    expect(wrongImageType).toMatchObject({ status: "blocked", issue: { code: "image-selection-invalid" } })
    expect(withImage.documentValues.coverImage?.value).toEqual(pngSelection)
    expect(JSON.stringify(withImage)).not.toContain("data:image")
  })

  it("keeps collection absence distinct from an included empty collection", () => {
    const initial = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const included = apply(initial, { kind: "collection.inclusion.set", fieldKey: "entries", included: true })
    const withItem = apply(included, {
      kind: "collection-item.add",
      fieldKey: "entries",
      rowId: "row-1",
    })

    expect(initial.collections.entries?.included).toBe(false)
    expect(included.collections.entries).toEqual({ included: true, items: [] })
    expect(withItem.collections.entries?.items[0]).toMatchObject({ rowId: "row-1", itemKey: "item-1" })
    expect(Object.values(withItem.collections.entries?.items[0]?.values ?? {}).every((entry) => entry.value == null))
      .toBe(true)
  })

  it("enforces collection-local item identity and the local row bound", () => {
    let state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "collection-item.add", fieldKey: "entries", rowId: "row-1" })
    state = apply(state, { kind: "collection-item.add", fieldKey: "entries", rowId: "row-2" })

    const duplicate = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "collection-item-key.set",
      fieldKey: "entries",
      rowId: "row-2",
      itemKey: "item-1",
    })
    expect(duplicate).toMatchObject({
      status: "blocked",
      issue: { code: "collection-item-key-duplicate" },
    })

    for (let index = 2; index < REALDOC_E54_MAX_COLLECTION_ITEMS; index += 1) {
      state = apply(state, {
        kind: "collection-item.add",
        fieldKey: "entries",
        rowId: `row-${index + 1}`,
      })
    }
    const overLimit = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "collection-item.add",
      fieldKey: "entries",
      rowId: "row-over-limit",
    })
    expect(state.collections.entries?.items).toHaveLength(REALDOC_E54_MAX_COLLECTION_ITEMS)
    expect(overLimit).toMatchObject({ status: "blocked", issue: { code: "collection-row-limit" } })
  })

  it("invalidates all temporary values when any projection pin changes", () => {
    const initial = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const dirty = apply(initial, {
      kind: "document-value.set",
      fieldKey: "documentTitle",
      value: "Temporary value",
    })
    const changedProjection = {
      ...REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      projectionFingerprint: `sha256:${"4".repeat(64)}`,
    }
    const reconciled = reconcileTestInputFormState(dirty, changedProjection)

    expect(reconciled.dirty).toBe(false)
    expect(reconciled.revision).toBe(0)
    expect(reconciled.documentValues.documentTitle?.value).toBeNull()
    expect(reconciled.projectionPins.projectionFingerprint).toBe(changedProjection.projectionFingerprint)
  })
})
