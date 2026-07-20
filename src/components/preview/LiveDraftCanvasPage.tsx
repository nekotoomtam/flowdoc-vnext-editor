import { useEffect, useRef } from "react"
import type { CoreLiveDraftTextFlowDisplayListV1 } from "../../core/coreAdapter"
import { ensureFlowDocLiveDraftCanvasFontV1 } from "../../editor/liveDraft/liveDraftCanvasFont"
import { paintFlowDocLiveDraftCanvasPageV1 } from "../../editor/liveDraft/liveDraftCanvasPainter"

type DisplayListPage = CoreLiveDraftTextFlowDisplayListV1["pages"][number]

export function LiveDraftCanvasPage({
  displayListFingerprint,
  page,
}: {
  displayListFingerprint: string
  page: DisplayListPage
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas == null) return
    let cancelled = false
    canvas.dataset.paintStatus = "loading-font"
    void ensureFlowDocLiveDraftCanvasFontV1().then(() => {
      if (cancelled) return
      const metrics = paintFlowDocLiveDraftCanvasPageV1({ canvas, page })
      canvas.dataset.paintStatus = "painted"
      canvas.dataset.commandCount = String(metrics.commandCount)
      canvas.dataset.nonBlankCommandCount = String(metrics.nonBlankCommandCount)
      canvas.dataset.paintDurationMs = String(metrics.paintDurationMs)
      canvas.dataset.pixelRatio = String(metrics.pixelRatio)
    }).catch((error: unknown) => {
      if (cancelled) return
      canvas.dataset.paintStatus = "blocked"
      canvas.dataset.paintError = error instanceof Error ? error.message : String(error)
    })
    return () => { cancelled = true }
  }, [displayListFingerprint, page])

  return (
    <figure
      className="live-draft-canvas-page-frame"
      data-page-height-pt={page.heightPt}
      data-page-index={page.pageIndex}
      data-page-width-pt={page.widthPt}
    >
      <canvas
        aria-label={`Live Draft page ${page.pageNumber}`}
        className="live-draft-canvas-page"
        data-display-list-fingerprint={displayListFingerprint}
        data-page-index={page.pageIndex}
        ref={canvasRef}
        role="img"
      >
        Live Draft page {page.pageNumber}
      </canvas>
      <figcaption>Page {page.pageNumber}</figcaption>
    </figure>
  )
}
