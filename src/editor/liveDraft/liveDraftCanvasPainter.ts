import type { CoreLiveDraftTextFlowDisplayListV1 } from "../../core/coreAdapter"

export const FLOWDOC_LIVE_DRAFT_CANVAS_CSS_PIXELS_PER_POINT = 4 / 3
export const FLOWDOC_LIVE_DRAFT_CANVAS_MAX_PIXEL_RATIO = 2

export interface FlowDocLiveDraftCanvasPaintMetricsV1 {
  pageIndex: number
  commandCount: number
  nonBlankCommandCount: number
  widthPx: number
  heightPx: number
  pixelRatio: number
  paintDurationMs: number
}

type DisplayListPage = CoreLiveDraftTextFlowDisplayListV1["pages"][number]

export function paintFlowDocLiveDraftCanvasPageV1(input: {
  canvas: HTMLCanvasElement
  page: DisplayListPage
  devicePixelRatio?: number
  now?: () => number
}): FlowDocLiveDraftCanvasPaintMetricsV1 {
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
  if (context == null) throw new Error("Live Draft Canvas 2D context is unavailable")

  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, widthPx, heightPx)
  context.setTransform(pointScale, 0, 0, pointScale, 0, 0)
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, input.page.widthPt, input.page.heightPt)
  context.save()
  context.beginPath()
  context.rect(
    input.page.body.xPt,
    input.page.body.yPt,
    input.page.body.widthPt,
    input.page.body.heightPt,
  )
  context.clip()
  context.textAlign = "start"
  context.textBaseline = "alphabetic"
  input.page.commands.forEach((command) => {
    context.fillStyle = `#${command.style.color}`
    context.font = `${command.style.fontSizePt}pt "${command.style.fontFamily}"`
    context.fillText(command.text, command.bounds.xPt, command.baselineYPt)
  })
  context.restore()

  return {
    pageIndex: input.page.pageIndex,
    commandCount: input.page.commands.length,
    nonBlankCommandCount: input.page.commands.filter((command) => command.text.trim().length > 0).length,
    widthPx,
    heightPx,
    pixelRatio,
    paintDurationMs: now() - startedAt,
  }
}
