import { useEffect, useState } from "react"
import { LoaderCircle, RefreshCw, ZoomIn, ZoomOut } from "lucide-react"
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

const MIN_ZOOM = 0.75
const MAX_ZOOM = 1.5
const ZOOM_STEP = 0.25

type PdfLoadState =
  | { status: "loading" }
  | { status: "ready"; document: PDFDocumentProxy }
  | { status: "failed" }

export function clampPublishedPreviewZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function createPublishedPreviewPageNumbers(pageCount: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(pageCount)) }, (_, index) => index + 1)
}

function PublishedPreviewPdfPage({
  document,
  pageCount,
  pageNumber,
  zoom,
}: {
  document: PDFDocumentProxy
  pageCount: number
  pageNumber: number
  zoom: number
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (canvas == null) return
    let disposed = false
    let renderTask: RenderTask | null = null
    setFailed(false)
    void document.getPage(pageNumber).then(async (page) => {
      if (disposed) return
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const displayViewport = page.getViewport({ scale: zoom })
      const renderViewport = page.getViewport({ scale: zoom * pixelRatio })
      canvas.width = Math.ceil(renderViewport.width)
      canvas.height = Math.ceil(renderViewport.height)
      canvas.style.width = `${Math.ceil(displayViewport.width)}px`
      canvas.style.aspectRatio = `${displayViewport.width} / ${displayViewport.height}`
      renderTask = page.render({ canvas, viewport: renderViewport })
      await renderTask.promise
    }).catch(() => {
      if (!disposed) setFailed(true)
    })
    return () => {
      disposed = true
      renderTask?.cancel()
    }
  }, [canvas, document, pageNumber, zoom])

  return (
    <article aria-label={`Page ${pageNumber} of ${pageCount}`} className="published-preview-page">
      {failed ? (
        <div className="published-preview-page-failed" role="alert">Page could not be rendered</div>
      ) : null}
      <canvas
        aria-label={`Rendered PDF page ${pageNumber}`}
        className="published-preview-page-canvas"
        ref={setCanvas}
        role="img"
      />
      <span>{pageNumber} / {pageCount}</span>
    </article>
  )
}

export function PublishedPreviewPdf({
  title,
  url,
}: {
  title: string
  url: string
}) {
  const [loadState, setLoadState] = useState<PdfLoadState>({ status: "loading" })
  const [loadRevision, setLoadRevision] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    let loadedDocument: PDFDocumentProxy | null = null
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoadState({ status: "loading" })
    void fetch(url, { signal: controller.signal }).then(async (response) => {
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
      if (!response.ok || contentType !== "application/pdf") throw new Error("Preview PDF was unavailable")
      return new Uint8Array(await response.arrayBuffer())
    }).then(async (bytes) => {
      if (disposed) return
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      loadingTask = pdfjs.getDocument({ data: bytes })
      loadedDocument = await loadingTask.promise
      if (disposed) {
        await loadedDocument.destroy()
        return
      }
      setLoadState({ status: "ready", document: loadedDocument })
    }).catch(() => {
      if (!disposed) setLoadState({ status: "failed" })
    })
    return () => {
      disposed = true
      controller.abort()
      if (loadedDocument != null) void loadedDocument.destroy()
      else void loadingTask?.destroy()
    }
  }, [loadRevision, url])

  if (loadState.status === "loading") return (
    <div aria-live="polite" className="published-preview-pdf-state" role="status">
      <LoaderCircle aria-hidden="true" className="is-spinning" size={22} />
      <strong>Rendering PDF pages</strong>
    </div>
  )

  if (loadState.status === "failed") return (
    <div className="published-preview-pdf-state published-preview-pdf-error" role="alert">
      <strong>PDF pages could not be displayed</strong>
      <button className="tool-button" onClick={() => setLoadRevision((current) => current + 1)} type="button">
        <RefreshCw aria-hidden="true" size={15} />
        <span>Retry preview</span>
      </button>
    </div>
  )

  const pageNumbers = createPublishedPreviewPageNumbers(loadState.document.numPages)
  return (
    <section aria-label={`${title} PDF pages`} className="published-preview-pdf">
      <div className="published-preview-pdf-toolbar">
        <strong>{pageNumbers.length} pages</strong>
        <div>
          <button
            aria-label="Zoom out PDF preview"
            className="icon-button"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((current) => clampPublishedPreviewZoom(current - ZOOM_STEP))}
            title="Zoom out"
            type="button"
          >
            <ZoomOut aria-hidden="true" size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in PDF preview"
            className="icon-button"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((current) => clampPublishedPreviewZoom(current + ZOOM_STEP))}
            title="Zoom in"
            type="button"
          >
            <ZoomIn aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      <div className="published-preview-page-list">
        {pageNumbers.map((pageNumber) => (
          <PublishedPreviewPdfPage
            document={loadState.document}
            key={pageNumber}
            pageCount={pageNumbers.length}
            pageNumber={pageNumber}
            zoom={zoom}
          />
        ))}
      </div>
    </section>
  )
}
