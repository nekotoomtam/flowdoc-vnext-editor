import { describe, expect, it } from "vitest"
import {
  getPaperBounds,
  getPaperContentBounds,
  getPaperDocumentStackGeometry,
  getPaperPageGeometry,
  getScaledPaperGap,
} from "../editor/paper/paperGeometry"
import {
  createDefaultPaperModel,
  createPaperModel,
  DEFAULT_PAPER_GAP_PX,
  setPaperPreset,
  setPaperZoom,
} from "../editor/paper/paperModel"

describe("paper model and geometry", () => {
  it("locks A4 and Letter presets as stable page geometry", () => {
    const a4 = createDefaultPaperModel()
    const letter = setPaperPreset(a4, "Letter")

    expect(a4).toMatchObject({
      gapPx: DEFAULT_PAPER_GAP_PX,
      heightPx: 1123,
      label: "A4",
      marginPx: 72,
      preset: "A4",
      widthPx: 794,
      zoom: 0.85,
    })
    expect(letter).toMatchObject({
      gapPx: DEFAULT_PAPER_GAP_PX,
      heightPx: 1056,
      label: "Letter",
      marginPx: 72,
      preset: "Letter",
      widthPx: 816,
      zoom: a4.zoom,
    })
  })

  it("derives content and scaled shell bounds from the paper model", () => {
    const a4 = createPaperModel("A4", 0.85)
    const geometry = getPaperPageGeometry(a4)

    expect(getPaperContentBounds(a4)).toEqual({
      height: 979,
      width: 650,
    })
    expect(getPaperBounds(a4)).toEqual({
      height: 1123 * 0.85,
      width: 794 * 0.85,
    })
    expect(geometry).toMatchObject({
      contentBounds: {
        height: 979,
        width: 650,
      },
      marginPx: 72,
      pageBounds: {
        height: 1123,
        width: 794,
      },
      scaledContentBounds: {
        height: 979 * 0.85,
        width: 650 * 0.85,
      },
      scaledMarginPx: 72 * 0.85,
      shellBounds: {
        height: 1123 * 0.85,
        width: 794 * 0.85,
      },
    })
  })

  it("computes document stack height from page model facts only", () => {
    const a4 = createPaperModel("A4", 0.85)
    const stack = getPaperDocumentStackGeometry(a4, 3)
    const scaledGap = DEFAULT_PAPER_GAP_PX * 0.85

    expect(getScaledPaperGap(a4)).toBe(scaledGap)
    expect(stack).toEqual({
      pageCount: 3,
      pageGapPx: scaledGap,
      pageHeightPx: 1123 * 0.85,
      pageWidthPx: 794 * 0.85,
      stackHeightPx: 1123 * 0.85 * 3 + scaledGap * 2,
      stackWidthPx: 794 * 0.85,
    })
  })

  it("keeps stack geometry deterministic across preset and zoom changes", () => {
    const a4 = createPaperModel("A4", 0.85)
    const letter = setPaperPreset(a4, "Letter")
    const zoomedLetter = setPaperZoom(letter, 1.1)

    expect(getPaperDocumentStackGeometry(letter, 2)).toMatchObject({
      pageCount: 2,
      pageGapPx: DEFAULT_PAPER_GAP_PX * 0.85,
      pageHeightPx: 1056 * 0.85,
      pageWidthPx: 816 * 0.85,
      stackHeightPx: 1056 * 0.85 * 2 + DEFAULT_PAPER_GAP_PX * 0.85,
    })
    expect(getPaperDocumentStackGeometry(zoomedLetter, 2)).toMatchObject({
      pageCount: 2,
      pageGapPx: DEFAULT_PAPER_GAP_PX * 1.1,
      pageHeightPx: 1056 * 1.1,
      pageWidthPx: 816 * 1.1,
      stackHeightPx: 1056 * 1.1 * 2 + DEFAULT_PAPER_GAP_PX * 1.1,
    })
    expect(getPaperDocumentStackGeometry(zoomedLetter, -4)).toEqual({
      pageCount: 0,
      pageGapPx: DEFAULT_PAPER_GAP_PX * 1.1,
      pageHeightPx: 1056 * 1.1,
      pageWidthPx: 816 * 1.1,
      stackHeightPx: 0,
      stackWidthPx: 0,
    })
  })
})
