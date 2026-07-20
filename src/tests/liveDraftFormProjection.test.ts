import { describe, expect, it } from "vitest"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"
import { projectFlowDocLiveDraftFormCandidateV1 } from "../editor/liveDraft/liveDraftFormProjection"
import { projectTestInputFormCanonicalCandidate } from "../editor/preview/testInputFormCanonicalCandidate"
import { applyTestInputFormCommand, createTestInputFormState } from "../editor/preview/testInputFormState"

const assets = { version: 1 as const, images: {} }

describe("LIVE-DRAFT-XR-3 bounded Form projection", () => {
  it("projects one selected text field with revision and content fingerprints", () => {
    const initial = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const applied = applyTestInputFormCommand(initial, REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE, {
      kind: "document-value.set",
      fieldKey: "documentTitle",
      value: "สรุปรายงาน Prepared summary",
    })
    if (applied.status !== "applied") throw new Error(applied.issue.message)
    const candidate = projectTestInputFormCanonicalCandidate(
      applied.state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      assets,
    )
    const projection = projectFlowDocLiveDraftFormCandidateV1({
      documentId: "document-1",
      structureRevision: 7,
      fieldKey: "documentTitle",
      formState: applied.state,
      candidate,
    })

    expect(projection).toMatchObject({
      status: "ready",
      documentId: "document-1",
      structureRevision: 7,
      formRevision: 1,
      fieldKey: "documentTitle",
      text: "สรุปรายงาน Prepared summary",
      contracts: {
        selectedScalarOnly: true,
        wholeDocumentResolution: false,
        backendAdmission: false,
        storage: "memory-only",
      },
    })
    if (projection.status !== "ready") throw new Error(projection.reason)
    expect(projection.draftSnapshotFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(projection.canonicalFormCandidateFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u)
  })

  it("stays not-ready for an empty field and blocks a non-text selection", () => {
    const state = createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const candidate = projectTestInputFormCanonicalCandidate(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      assets,
    )
    expect(projectFlowDocLiveDraftFormCandidateV1({
      documentId: "document-1",
      structureRevision: 7,
      fieldKey: "documentTitle",
      formState: state,
      candidate,
    }).status).toBe("not-ready")
    expect(projectFlowDocLiveDraftFormCandidateV1({
      documentId: "document-1",
      structureRevision: 7,
      fieldKey: "totalValue",
      formState: {
        ...state,
        revision: 1,
        documentValues: { ...state.documentValues, totalValue: { valueType: "number", value: "12" } },
      },
      candidate: {
        ...candidate,
        status: "ready-for-admission",
        data: { version: 2, values: { totalValue: 12 } },
        collections: {},
        issues: [],
      },
    }).status).toBe("blocked")
  })
})
