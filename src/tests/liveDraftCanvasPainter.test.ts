import { describe, expect, it, vi } from "vitest"
import type { CoreLiveDraftTextFlowDisplayListV1 } from "../core/coreAdapter"
import {
  paintFlowDocLiveDraftCanvasPageV1,
} from "../editor/liveDraft/liveDraftCanvasPainter"

type DisplayListPage = CoreLiveDraftTextFlowDisplayListV1["pages"][number]

function page(): DisplayListPage {
  return {
    pageIndex: 0,
    pageNumber: 1,
    widthPt: 595.28,
    heightPt: 841.89,
    body: { xPt: 72, yPt: 72, widthPt: 180, heightPt: 252 },
    fragmentFingerprint: "sha256:fragment",
    commands: [{
      id: "paint:line-0",
      kind: "text-line",
      pageIndex: 0,
      paintOrder: 0,
      textBlockId: "body",
      fragmentId: "fragment-0",
      lineIndex: 0,
      text: "สรุปรายงาน",
      startOffset: 0,
      endOffset: 10,
      sourceStart: {
        textBlockId: "body", inlineId: "body:text", authoredOffset: 0, resolvedOffset: 0, affinity: "forward",
      },
      sourceEnd: {
        textBlockId: "body", inlineId: "body:text", authoredOffset: 10, resolvedOffset: 10, affinity: "backward",
      },
      bounds: { xPt: 72, yPt: 72, widthPt: 80, heightPt: 18 },
      baselineYPt: 85.5,
      style: {
        styleKey: "paragraph/body",
        fontId: "sarabun-regular",
        fontFamily: "FlowDoc Live Draft Sarabun",
        fontSizePt: 12,
        baselineOffsetPt: 13.5,
        color: "172033",
      },
    }],
  }
}

describe("LIVE-DRAFT-XR-4 Canvas painter", () => {
  it("paints Core commands at locked point coordinates without measuring or relayout", () => {
    const context = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      rect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      setTransform: vi.fn(),
      fillStyle: "",
      font: "",
      textAlign: "start",
      textBaseline: "alphabetic",
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement
    const times = [10, 12.5]
    const metrics = paintFlowDocLiveDraftCanvasPageV1({
      canvas,
      page: page(),
      devicePixelRatio: 2,
      now: () => times.shift() ?? 12.5,
    })

    expect(canvas.width).toBe(1587)
    expect(canvas.height).toBe(2245)
    expect(context.rect).toHaveBeenCalledWith(72, 72, 180, 252)
    expect(context.fillText).toHaveBeenCalledWith("สรุปรายงาน", 72, 85.5)
    expect(context.font).toBe('12pt "FlowDoc Live Draft Sarabun"')
    expect(metrics).toEqual({
      pageIndex: 0,
      commandCount: 1,
      nonBlankCommandCount: 1,
      widthPx: 1587,
      heightPx: 2245,
      pixelRatio: 2,
      paintDurationMs: 2.5,
    })
  })

  it("contains no browser text measurement path", async () => {
    const source = await import("node:fs").then(({ readFileSync }) => (
      readFileSync(new URL("../editor/liveDraft/liveDraftCanvasPainter.ts", import.meta.url), "utf8")
    ))
    expect(source).not.toContain("measureText")
  })
})
