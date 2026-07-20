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
