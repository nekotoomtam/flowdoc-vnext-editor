import { describe, expect, it } from "vitest"
import {
  applyTestInputFormCommand,
  createTestInputFormState,
} from "../editor/preview/testInputFormState"
import { projectTestInputFormDataJsonDraft } from "../editor/preview/testInputFormDataJson"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"

describe("PDF-EXPORT-REALDOC-E.5.6 Form data JSON draft", () => {
  it("projects dynamic field keys and collection rows without claiming canonical validation", () => {
    let state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "document-value.set",
      fieldKey: "documentTitle",
      value: "Example report",
    }).state
    state = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "collection.inclusion.set",
      fieldKey: "entries",
      included: true,
    }).state
    state = applyTestInputFormCommand(state, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "collection-item.add",
      fieldKey: "entries",
      rowId: "row-1",
    }).state
    const draft = projectTestInputFormDataJsonDraft(state)
    expect(draft).toMatchObject({
      kind: "editor-form-data-json-draft",
      status: "draft-not-validated",
      fields: { documentTitle: "Example report", approved: null },
      collections: { entries: [{ itemKey: "item-1" }] },
    })
    expect(draft).not.toHaveProperty("canonicalInput")
    expect(draft).not.toHaveProperty("dataSnapshot")
  })
})
