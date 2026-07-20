import { describe, expect, it } from "vitest"
import { createCoreLiveDraftOneBlockLayoutSessionV1 } from "../core/coreAdapter"

describe("LIVE-DRAFT-XR-2 Core one-block adapter", () => {
  it("injects external line facts, accepts them, paginates them, and reuses the Core cache", () => {
    let providerCalls = 0
    const session = createCoreLiveDraftOneBlockLayoutSessionV1({
      measurementProfileId: "xr2-test-profile",
      profileRevision: "xr2-test-revision",
    })
    const input = {
      documentId: "document-1",
      instanceRevision: 1,
      sectionId: "section-1",
      textBlockId: "block-1",
      text: "aa bb",
      availableWidthPt: 20,
      pageBodyHeightPt: 10,
      styleKey: "paragraph/test",
    }
    const measure = () => {
      providerCalls += 1
      return {
        lines: ["aa ", "bb"],
        lineHeightPt: 10,
        widthPt: 15,
        heightPt: 20,
        lineBoxes: [{
          index: 0, text: "aa ", startOffset: 0, endOffset: 3,
          widthPt: 15, heightPt: 10, yOffsetPt: 0,
        }, {
          index: 1, text: "bb", startOffset: 3, endOffset: 5,
          widthPt: 10, heightPt: 10, yOffsetPt: 10,
        }],
      }
    }

    const cold = session.layout(input, measure)
    const warm = session.layout(input, measure)

    expect(providerCalls).toBe(1)
    expect(cold.measurement.cacheStatus).toBe("miss")
    expect(cold.timings.providerInvoked).toBe(true)
    expect(warm.measurement.cacheStatus).toBe("hit")
    expect(warm.timings.providerInvoked).toBe(false)
    expect(cold.acceptanceSummary).toEqual({ lineCount: 2, renderedLength: 5, totalHeightPt: 20 })
    expect(cold.pagination).toMatchObject({
      status: "complete",
      summary: { pageCount: 2, fragmentCount: 2, lineCount: 2, splitAcrossPages: true },
      work: { pageAttemptCount: 2, cursorCommitCount: 2 },
    })
    expect(cold.pagination.fingerprint).toBe(warm.pagination.fingerprint)
    expect(cold.pagination.measurementFingerprint).toBe(warm.pagination.measurementFingerprint)
  })
})
