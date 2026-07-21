import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import type { CoreLiveDraftMultiRunDisplayListV1 } from "../core/coreAdapter"
import { paintFlowDocLiveDraftMultiRunCanvasV1 } from "../editor/liveDraft/liveDraftMultiRunCanvasPainter"

function displayList(): CoreLiveDraftMultiRunDisplayListV1 {
  const commandBase = {
    kind: "text-fragment" as const,
    textBlockId: "text-block-mixed",
    layoutId: "layout-mixed",
    layoutFingerprint: `sha256:${"a".repeat(64)}`,
    lineIndex: 0,
    lineFingerprint: `sha256:${"b".repeat(64)}`,
    shapingRunId: "run",
    renderStartOffset: 0,
    renderEndOffset: 1,
    lineBounds: { xLayoutUnit: 72_000_000, yLayoutUnit: 72_000_000, widthLayoutUnit: 5_000_000, heightLayoutUnit: 24_000_000 },
    metricBounds: { xLayoutUnit: 72_000_000, yLayoutUnit: 83_200_000, widthLayoutUnit: 5_000_000, heightLayoutUnit: 10_000_000 },
    baselineYLayoutUnit: 91_200_000,
    advanceLayoutUnit: 5_000_000,
    ascentLayoutUnit: 8_000_000,
    descentLayoutUnit: 2_000_000,
    lineGapLayoutUnit: 1_000_000,
    baselineShiftLayoutUnit: 0 as const,
    sourceSegments: [],
  }
  const commands: CoreLiveDraftMultiRunDisplayListV1["commands"] = [{
    ...commandBase,
    id: "paint:a",
    paintOrder: 0,
    fragmentId: "fragment-a",
    fragmentFingerprint: `sha256:${"c".repeat(64)}`,
    text: "A",
    baselineXLayoutUnit: 72_000_000,
    style: {
      styleKey: "regular-10",
      fontFaceId: "sarabun-regular",
      fontFamily: "Sarabun",
      fontSha256: "d".repeat(64),
      fontWeight: 400,
      fontStyle: "normal",
      fontSizeLayoutUnit: 10_000_000,
      textColor: "202020",
    },
  }, {
    ...commandBase,
    id: "paint:b",
    paintOrder: 1,
    fragmentId: "fragment-b",
    fragmentFingerprint: `sha256:${"e".repeat(64)}`,
    text: "B",
    baselineXLayoutUnit: 77_000_000,
    style: {
      styleKey: "bold-24",
      fontFaceId: "sarabun-bold",
      fontFamily: "Sarabun",
      fontSha256: "f".repeat(64),
      fontWeight: 700,
      fontStyle: "normal",
      fontSizeLayoutUnit: 24_000_000,
      textColor: "202020",
    },
  }]
  return {
    source: "vnext-text-block-multi-run-display-list-v1",
    contractVersion: 1,
    projectionId: "projection",
    layoutId: "layout-mixed",
    textBlockId: "text-block-mixed",
    layoutFingerprint: `sha256:${"a".repeat(64)}`,
    layoutUnitPolicyFingerprint: `sha256:${"0".repeat(64)}`,
    contracts: {
      consumes: "vnext-text-block-multi-run-layout-v1",
      geometryUnit: "micro-point-integer",
      positionsAndBaselines: "core-accepted-positioned-fragments",
      rendererConversion: "divide-once-at-paint-boundary",
      rendererMayMeasureText: false,
      rendererMayRelayout: false,
      glyphRasterization: "renderer-owned",
      artifactBytes: false,
      productionBinding: false,
    },
    status: "ready",
    origin: { xLayoutUnit: 72_000_000, yLayoutUnit: 72_000_000 },
    lines: [],
    commands,
    fingerprint: `sha256:${"1".repeat(64)}`,
    issues: [],
    summary: { lineCount: 1, commandCount: 2, nonBlankCommandCount: 2, widthLayoutUnit: 19_400_000, heightLayoutUnit: 24_000_000 },
  }
}

describe("Live Draft MR1 multi-run Canvas painter", () => {
  it("paints every fragment at the Core baseline with its own font style", () => {
    const assignedFonts: string[] = []
    const context = {
      beginPath: vi.fn(), clearRect: vi.fn(), clip: vi.fn(), fillRect: vi.fn(),
      fillText: vi.fn(), rect: vi.fn(), restore: vi.fn(), save: vi.fn(), setTransform: vi.fn(),
      fillStyle: "", textAlign: "start", textBaseline: "alphabetic",
      _font: "",
      set font(value: string) { this._font = value; assignedFonts.push(value) },
      get font() { return this._font },
    }
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => context) } as unknown as HTMLCanvasElement
    const times = [10, 12.5]
    const metrics = paintFlowDocLiveDraftMultiRunCanvasV1({
      canvas,
      displayList: displayList(),
      page: { widthPt: 595.28, heightPt: 841.89, clip: { xPt: 72, yPt: 72, widthPt: 100, heightPt: 24 } },
      devicePixelRatio: 2,
      now: () => times.shift() ?? 12.5,
    })

    expect(canvas.width).toBe(1587)
    expect(canvas.height).toBe(2245)
    expect(context.fillText).toHaveBeenNthCalledWith(1, "A", 72, 91.2)
    expect(context.fillText).toHaveBeenNthCalledWith(2, "B", 77, 91.2)
    expect(assignedFonts).toEqual(['normal 400 10pt "Sarabun"', 'normal 700 24pt "Sarabun"'])
    expect(metrics).toEqual({
      commandCount: 2,
      nonBlankCommandCount: 2,
      distinctFontFaceIds: ["sarabun-regular", "sarabun-bold"],
      sharedBaselineYLayoutUnits: [91_200_000],
      widthPx: 1587,
      heightPx: 2245,
      pixelRatio: 2,
      paintDurationMs: 2.5,
      rendererMeasuredText: false,
      rendererRelayout: false,
    })
  })

  it("contains no browser text measurement or relayout path", () => {
    const source = readFileSync(
      new URL("../editor/liveDraft/liveDraftMultiRunCanvasPainter.ts", import.meta.url),
      "utf8",
    )
    expect(source).not.toContain("measureText")
    expect(source).not.toMatch(/breakText|wrapText|layoutText/u)
    expect(source).toContain("CORE_LIVE_DRAFT_LAYOUT_UNITS_PER_POINT")
  })
})
