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

  it("retains XR5 resolved-field source runs in Core display-list commands", () => {
    const session = createCoreLiveDraftOneBlockLayoutSessionV1({
      measurementProfileId: "xr5-test-profile",
      profileRevision: "xr5-test-revision",
    })
    const result = session.layout({
      documentId: "document-1",
      instanceRevision: 1,
      sectionId: "section-1",
      textBlockId: "field-block",
      text: "Hello Acme",
      availableWidthPt: 180,
      pageBodyHeightPt: 36,
      styleKey: "paragraph",
      sourceRuns: [{
        inlineId: "before",
        kind: "text",
        renderedText: "Hello ",
        renderStartOffset: 0,
        renderEndOffset: 6,
        styleKey: "paragraph",
      }, {
        inlineId: "customer",
        kind: "resolved-field",
        fieldKey: "customer.name",
        renderedText: "Acme",
        renderStartOffset: 6,
        renderEndOffset: 10,
        styleKey: "paragraph",
      }],
      displayList: {
        projectionId: "xr5-field-display-list",
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
    }, () => ({
      lines: ["Hello Acme"],
      lineHeightPt: 18,
      widthPt: 64,
      heightPt: 18,
      lineBoxes: [{
        index: 0,
        text: "Hello Acme",
        startOffset: 0,
        endOffset: 10,
        widthPt: 64,
        heightPt: 18,
        yOffsetPt: 0,
      }],
    }))

    expect(result.displayList?.status).toBe("ready")
    expect(result.displayList?.commands[0].sourceSegments).toEqual(expect.arrayContaining([
      expect.objectContaining({ inlineId: "before", kind: "text", renderedText: "Hello " }),
      expect.objectContaining({ inlineId: "customer", kind: "resolved-field", fieldKey: "customer.name", renderedText: "Acme" }),
    ]))
  })
})
