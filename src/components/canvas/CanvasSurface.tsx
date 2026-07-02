import type { CSSProperties } from "react"
import { CanvasScrollRoot } from "./CanvasScrollRoot"
import { PaperPage } from "../paper/PaperPage"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import { getPaperDocumentStackGeometry } from "../../editor/paper/paperGeometry"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import type { ViewportScrollRootFacts } from "../../editor/viewport/viewportMeasurement"

export interface CanvasSurfaceProps {
  document: CoreEditorDocumentSummary
  onSelectNode: (nodeId: string, source: "canvas") => void
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function CanvasSurface({
  document,
  onSelectNode,
  pages,
  paper,
  selectedNodeId,
  onViewportFactsChange,
}: CanvasSurfaceProps) {
  const pageCount = pages.length
  const stackGeometry = getPaperDocumentStackGeometry(paper, pageCount)
  const viewportMeasurementKey = `${paper.preset}:${paper.zoom}:${stackGeometry.stackHeightPx}:${pageCount}`
  const canvasPaperStyle = {
    "--paper-shell-width": `${stackGeometry.pageWidthPx}px`,
    "--paper-stack-gap": `${stackGeometry.pageGapPx}px`,
    "--paper-stack-height": `${stackGeometry.stackHeightPx}px`,
  } as CSSProperties

  return (
    <CanvasScrollRoot
      measurementKey={viewportMeasurementKey}
      onViewportFactsChange={onViewportFactsChange}
    >
      <div className="canvas-stage" style={canvasPaperStyle}>
        <div className="canvas-page-meta" aria-label="Current page summary">
          <span>{document.title}</span>
          <span>
            {pageCount} preview pages / {paper.label} / {paper.widthPx} x {paper.heightPx}px
          </span>
        </div>
        <div className="paper-page-stack" aria-label="Preview page stack">
          {pages.map((page) => (
            <PaperPage
              key={page.id}
              page={page}
              pageCount={pageCount}
              paper={paper}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))}
        </div>
      </div>
    </CanvasScrollRoot>
  )
}
