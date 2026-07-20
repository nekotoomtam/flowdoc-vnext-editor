import { describe, expect, it } from "vitest"
import {
  FLOWDOC_LIVE_DRAFT_EXACTNESS_STATES,
  FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
  isFlowDocLiveDraftResultCurrentV1,
  parseFlowDocLiveDraftWorkerRequestV1,
  type FlowDocLiveDraftRequestIdentityV1,
  type FlowDocLiveDraftWorkerResultV1,
} from "../editor/liveDraft/liveDraftWorkerProtocol"

const IDENTITY: FlowDocLiveDraftRequestIdentityV1 = {
  documentId: "document-1",
  structureRevision: 3,
  draftSnapshotFingerprint: "draft:3",
  canonicalFormCandidateFingerprint: "form:3",
  assetRegistryFingerprint: "assets:1",
  measurementProfileId: "profile:1",
  fontManifestFingerprint: "fonts:1",
  wasmSha256: "a".repeat(64),
  layoutPipelineVersion: "layout:1",
  requestId: "request-3",
  requestRevision: 3,
}

describe("LIVE-DRAFT-XR-0 worker protocol", () => {
  it("retains the honest exactness vocabulary", () => {
    expect(FLOWDOC_LIVE_DRAFT_EXACTNESS_STATES).toEqual([
      "draft-updating",
      "draft-current",
      "draft-approximate",
      "draft-blocked",
      "published-exact",
      "stale",
    ])
  })

  it("parses an identity-pinned smoke layout request", () => {
    const request = {
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.layout",
      identity: IDENTITY,
      smokeRow: {
        rowId: "row-1",
        fixtureId: "fixture-1",
        scenarioId: "scenario-1",
        text: "Prepared summary",
        fontId: "sarabun-regular",
        fontSha256: "b".repeat(64),
      },
    }
    expect(parseFlowDocLiveDraftWorkerRequestV1(request)).toEqual(request)
    expect(parseFlowDocLiveDraftWorkerRequestV1({ ...request, identity: { ...IDENTITY, wasmSha256: null } })).toBeNull()
  })

  it("accepts only bounded XR-2 Core layout options", () => {
    const request = {
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.layout",
      identity: IDENTITY,
      smokeRow: {
        rowId: "row-1", fixtureId: "fixture-1", scenarioId: "scenario-1", text: "Prepared summary",
        fontId: "sarabun-regular", fontSha256: "b".repeat(64),
      },
      coreLayout: {
        availableWidthPt: 180,
        fontSizePt: 12,
        lineHeightPt: 18,
        pageBodyHeightPt: 252,
        styleKey: "paragraph/body",
        cacheAction: "clear-before",
      },
    }

    expect(parseFlowDocLiveDraftWorkerRequestV1(request)).toEqual(request)
    expect(parseFlowDocLiveDraftWorkerRequestV1({
      ...request,
      coreLayout: { ...request.coreLayout, cacheAction: "unknown" },
    })).toBeNull()
    expect(parseFlowDocLiveDraftWorkerRequestV1({
      ...request,
      coreLayout: { ...request.coreLayout, availableWidthPt: -1 },
    })).toBeNull()
  })

  it("parses the bounded XR-3 Form layout family without reusing the smoke row", () => {
    const request = {
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.form-layout",
      identity: IDENTITY,
      textBlock: {
        textBlockId: "live-draft-form:documentTitle",
        fieldKey: "documentTitle",
        text: "สรุปรายงาน",
        fontId: "sarabun-regular",
        fontSha256: "b".repeat(64),
      },
      coreLayout: {
        availableWidthPt: 180,
        fontSizePt: 12,
        lineHeightPt: 18,
        pageBodyHeightPt: 252,
        styleKey: "paragraph/body",
        cacheAction: "clear-before",
        displayList: {
          projectionId: "live-draft-form:document-1:3",
          pageWidthPt: 595.28,
          pageHeightPt: 841.89,
          bodyXPt: 72,
          bodyYPt: 72,
          fontId: "sarabun-regular",
          fontFamily: "FlowDoc Live Draft Sarabun",
          fontSizePt: 12,
          baselineOffsetPt: 13.5,
          color: "172033",
        },
      },
    }

    expect(parseFlowDocLiveDraftWorkerRequestV1(request)).toEqual(request)
    expect(parseFlowDocLiveDraftWorkerRequestV1({
      ...request,
      textBlock: { ...request.textBlock, text: "" },
    })).toBeNull()
  })

  it("accepts XR5 display-list and source-run facts on the QA layout family", () => {
    const request = {
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.layout",
      identity: IDENTITY,
      smokeRow: {
        rowId: "field-row",
        fixtureId: "v1-measure-field-chip-adjacency",
        scenarioId: "rich-inline-field-chip-adjacency",
        textBlockId: "live-draft-xr5:field-row",
        text: "Hello Acme",
        fontId: "sarabun-regular",
        fontSha256: "b".repeat(64),
      },
      coreLayout: {
        availableWidthPt: 180,
        fontSizePt: 12,
        lineHeightPt: 18,
        pageBodyHeightPt: 252,
        styleKey: "paragraph",
        cacheAction: "clear-before",
        sourceRuns: [{
          inlineId: "customer",
          kind: "resolved-field",
          fieldKey: "customer.name",
          renderStartOffset: 0,
          renderEndOffset: 10,
          renderedText: "Hello Acme",
          styleKey: "paragraph",
        }],
        displayList: {
          projectionId: "xr5-field-row",
          pageWidthPt: 595.28,
          pageHeightPt: 841.89,
          bodyXPt: 72,
          bodyYPt: 72,
          fontId: "sarabun-regular",
          fontFamily: "Sarabun",
          fontSizePt: 12,
          baselineOffsetPt: 13.5,
          color: "172033",
        },
      },
    }

    expect(parseFlowDocLiveDraftWorkerRequestV1(request)).toEqual(request)
    expect(parseFlowDocLiveDraftWorkerRequestV1({
      ...request,
      coreLayout: { ...request.coreLayout, sourceRuns: [{ ...request.coreLayout.sourceRuns[0], fieldKey: "" }] },
    })).toBeNull()
    expect(parseFlowDocLiveDraftWorkerRequestV1({
      ...request,
      smokeRow: { ...request.smokeRow, textBlockId: "" },
    })).toBeNull()
  })

  it("rejects a stale result when any pinned identity changes", () => {
    const result = {
      protocolVersion: FLOWDOC_LIVE_DRAFT_WORKER_PROTOCOL_VERSION,
      type: "live-draft.result",
      exactness: "draft-current",
      identity: IDENTITY,
      smokeRow: {
        rowId: "row-1", fixtureId: "fixture-1", scenarioId: "scenario-1", text: "x",
        fontId: "sarabun-regular", fontSha256: "b".repeat(64),
      },
      measurement: {},
      durationMs: 1,
    } as unknown as FlowDocLiveDraftWorkerResultV1
    expect(isFlowDocLiveDraftResultCurrentV1({ current: IDENTITY, result })).toBe(true)
    expect(isFlowDocLiveDraftResultCurrentV1({
      current: { ...IDENTITY, requestRevision: 4 },
      result,
    })).toBe(false)
  })
})
