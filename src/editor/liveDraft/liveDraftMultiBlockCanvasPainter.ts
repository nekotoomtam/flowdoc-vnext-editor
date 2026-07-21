import {
  CORE_LIVE_DRAFT_LAYOUT_UNITS_PER_POINT,
  type CoreLiveDraftMultiBlockDisplayListV1,
  type CoreLiveDraftMultiBlockPageGeometryV1,
} from "../../core/coreAdapter"
import {
  FLOWDOC_LIVE_DRAFT_CANVAS_CSS_PIXELS_PER_POINT,
  FLOWDOC_LIVE_DRAFT_CANVAS_MAX_PIXEL_RATIO,
} from "./liveDraftCanvasPainter"

export interface FlowDocLiveDraftMultiBlockCanvasPaintMetricsV1 {
  pageCount: number
  commandCount: number
  nonBlankCommandCount: number
  widthPx: number
  heightPx: number
  pixelRatio: number
  pageGapPx: number
  atomicSwapCount: 1
  paintDurationMs: number
  rendererMeasuredText: false
  rendererRelayout: false
  rendererPaginated: false
}

function toPoint(layoutUnit: number): number {
  return layoutUnit / CORE_LIVE_DRAFT_LAYOUT_UNITS_PER_POINT
}

export function paintFlowDocLiveDraftMultiBlockCanvasV1(input: {
  canvas: HTMLCanvasElement
  displayList: CoreLiveDraftMultiBlockDisplayListV1
  pageGeometry: CoreLiveDraftMultiBlockPageGeometryV1
  pageGapCssPx?: number
  devicePixelRatio?: number
  now?: () => number
  createCanvas?: () => HTMLCanvasElement
}): FlowDocLiveDraftMultiBlockCanvasPaintMetricsV1 {
  const now = input.now ?? (() => performance.now())
  const startedAt = now()
  const pixelRatio = Math.min(
    Math.max(input.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1, 1),
    FLOWDOC_LIVE_DRAFT_CANVAS_MAX_PIXEL_RATIO,
  )
  const pointScale = FLOWDOC_LIVE_DRAFT_CANVAS_CSS_PIXELS_PER_POINT * pixelRatio
  const pageGapPx = Math.round((input.pageGapCssPx ?? 16) * pixelRatio)
  const pageWidthPx = Math.round(toPoint(input.pageGeometry.widthLayoutUnit) * pointScale)
  const pageHeightPx = Math.round(toPoint(input.pageGeometry.heightLayoutUnit) * pointScale)
  const pageCount = input.displayList.summary.pageCount
  const widthPx = pageWidthPx
  const heightPx = pageHeightPx * pageCount + pageGapPx * Math.max(0, pageCount - 1)
  const scratch = input.createCanvas?.() ?? document.createElement("canvas")
  scratch.width = widthPx
  scratch.height = heightPx
  const context = scratch.getContext("2d", { alpha: false })
  if (context == null) throw new Error("MR1 multi-block scratch Canvas 2D context is unavailable")

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.fillStyle = "#e5e7eb"
  context.fillRect(0, 0, widthPx, heightPx)
  input.displayList.pages.forEach((page) => {
    const pageTopPx = page.pageIndex * (pageHeightPx + pageGapPx)
    context.fillStyle = "#ffffff"
    context.fillRect(0, pageTopPx, pageWidthPx, pageHeightPx)
    context.save()
    context.beginPath()
    context.rect(
      toPoint(input.pageGeometry.bodyXLayoutUnit) * pointScale,
      pageTopPx + toPoint(input.pageGeometry.bodyYLayoutUnit) * pointScale,
      toPoint(input.pageGeometry.bodyWidthLayoutUnit) * pointScale,
      toPoint(input.pageGeometry.bodyHeightLayoutUnit) * pointScale,
    )
    context.clip()
    context.textAlign = "start"
    context.textBaseline = "alphabetic"
    input.displayList.commands
      .filter((command) => command.pageIndex === page.pageIndex)
      .forEach((command) => {
        const fontSizePx = toPoint(command.style.fontSizeLayoutUnit) * pointScale
        context.fillStyle = `#${command.style.textColor}`
        context.font = `${command.style.fontStyle} ${command.style.fontWeight} ${fontSizePx}px "${command.style.fontFamily}"`
        context.fillText(
          command.text,
          toPoint(command.baselineXLayoutUnit) * pointScale,
          pageTopPx + toPoint(command.baselineYLayoutUnit) * pointScale,
        )
      })
    context.restore()
  })

  input.canvas.width = widthPx
  input.canvas.height = heightPx
  const visibleContext = input.canvas.getContext("2d", { alpha: false })
  if (visibleContext == null) throw new Error("MR1 multi-block visible Canvas 2D context is unavailable")
  visibleContext.setTransform(1, 0, 0, 1, 0, 0)
  visibleContext.drawImage(scratch, 0, 0)

  return {
    pageCount,
    commandCount: input.displayList.commands.length,
    nonBlankCommandCount: input.displayList.commands.filter((command) => command.text.trim().length > 0).length,
    widthPx,
    heightPx,
    pixelRatio,
    pageGapPx,
    atomicSwapCount: 1,
    paintDurationMs: now() - startedAt,
    rendererMeasuredText: false,
    rendererRelayout: false,
    rendererPaginated: false,
  }
}
