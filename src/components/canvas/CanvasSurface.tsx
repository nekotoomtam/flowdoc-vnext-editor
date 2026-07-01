import type { CSSProperties } from "react"
import { CanvasScrollRoot } from "./CanvasScrollRoot"
import { PaperPage } from "../paper/PaperPage"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"

export interface CanvasSurfaceProps {
  document: CoreEditorDocumentSummary
  onSelectNode: (nodeId: string, source: "canvas") => void
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
}

export function CanvasSurface({
  document,
  onSelectNode,
  pages,
  paper,
  selectedNodeId,
}: CanvasSurfaceProps) {
  const pageCount = pages.length
  const pageStackStyle = {
    "--paper-stack-gap": `${Math.max(18, paper.gapPx * paper.zoom)}px`,
  } as CSSProperties

  return (
    <CanvasScrollRoot>
      <div className="canvas-stage">
        <div className="canvas-page-meta" aria-label="Current page summary">
          <span>{document.title}</span>
          <span>
            {pageCount} preview pages / {paper.label} / {paper.widthPx} x {paper.heightPx}px
          </span>
        </div>
        <div className="paper-page-stack" aria-label="Preview page stack" style={pageStackStyle}>
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
