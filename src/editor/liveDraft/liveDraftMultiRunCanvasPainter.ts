import {
  CORE_LIVE_DRAFT_LAYOUT_UNITS_PER_POINT,
  type CoreLiveDraftMultiRunDisplayListV1,
} from "../../core/coreAdapter"
import {
  FLOWDOC_LIVE_DRAFT_CANVAS_CSS_PIXELS_PER_POINT,
  FLOWDOC_LIVE_DRAFT_CANVAS_MAX_PIXEL_RATIO,
} from "./liveDraftCanvasPainter"

export interface FlowDocLiveDraftMultiRunCanvasPaintMetricsV1 {
  commandCount: number
  nonBlankCommandCount: number
  distinctFontFaceIds: string[]
  sharedBaselineYLayoutUnits: number[]
  widthPx: number
  heightPx: number
  pixelRatio: number
  paintDurationMs: number
  rendererMeasuredText: false
  rendererRelayout: false
}

function toPoint(layoutUnit: number): number {
  return layoutUnit / CORE_LIVE_DRAFT_LAYOUT_UNITS_PER_POINT
}

export function paintFlowDocLiveDraftMultiRunCanvasV1(input: {
  canvas: HTMLCanvasElement
  displayList: CoreLiveDraftMultiRunDisplayListV1
  page: {
    widthPt: number
    heightPt: number
    clip: { xPt: number; yPt: number; widthPt: number; heightPt: number }
  }
  devicePixelRatio?: number
  now?: () => number
}): FlowDocLiveDraftMultiRunCanvasPaintMetricsV1 {
  const now = input.now ?? (() => performance.now())
  const startedAt = now()
  const pixelRatio = Math.min(
    Math.max(input.devicePixelRatio ?? globalThis.devicePixelRatio ?? 1, 1),
    FLOWDOC_LIVE_DRAFT_CANVAS_MAX_PIXEL_RATIO,
  )
  const pointScale = FLOWDOC_LIVE_DRAFT_CANVAS_CSS_PIXELS_PER_POINT * pixelRatio
  const widthPx = Math.round(input.page.widthPt * pointScale)
  const heightPx = Math.round(input.page.heightPt * pointScale)
  input.canvas.width = widthPx
  input.canvas.height = heightPx
  const context = input.canvas.getContext("2d", { alpha: false })
  if (context == null) throw new Error("MR1 Live Draft Canvas 2D context is unavailable")

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, widthPx, heightPx)
  context.setTransform(pointScale, 0, 0, pointScale, 0, 0)
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, input.page.widthPt, input.page.heightPt)
  context.save()
  context.beginPath()
  context.rect(
    input.page.clip.xPt,
    input.page.clip.yPt,
    input.page.clip.widthPt,
    input.page.clip.heightPt,
  )
  context.clip()
  context.textAlign = "start"
  context.textBaseline = "alphabetic"
  input.displayList.commands.forEach((command) => {
    const fontSizePt = toPoint(command.style.fontSizeLayoutUnit)
    context.fillStyle = `#${command.style.textColor}`
    context.font = `${command.style.fontStyle} ${command.style.fontWeight} ${fontSizePt}pt "${command.style.fontFamily}"`
    context.fillText(
      command.text,
      toPoint(command.baselineXLayoutUnit),
      toPoint(command.baselineYLayoutUnit),
    )
  })
  context.restore()

  return {
    commandCount: input.displayList.commands.length,
    nonBlankCommandCount: input.displayList.commands.filter((command) => command.text.trim().length > 0).length,
    distinctFontFaceIds: [...new Set(input.displayList.commands.map((command) => command.style.fontFaceId))],
    sharedBaselineYLayoutUnits: [...new Set(
      input.displayList.commands.map((command) => command.baselineYLayoutUnit),
    )],
    widthPx,
    heightPx,
    pixelRatio,
    paintDurationMs: now() - startedAt,
    rendererMeasuredText: false,
    rendererRelayout: false,
  }
}
