import type { CSSProperties } from "react"
import { PaperBlock } from "./PaperBlock"
import { getPaperPageGeometry } from "../../editor/paper/paperGeometry"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"

export interface PaperPageProps {
  page: RenderPageSummary
  pageCount: number
  paper: PaperModel
  selectedNodeId: string | null
}

export function PaperPage({
  page,
  pageCount,
  paper,
  selectedNodeId,
}: PaperPageProps) {
  const geometry = getPaperPageGeometry(paper)
  const shellStyle = {
    "--paper-shell-height": `${geometry.shellBounds.height}px`,
    "--paper-shell-width": `${geometry.shellBounds.width}px`,
  } as CSSProperties
  const pageStyle = {
    "--paper-height": `${geometry.pageBounds.height}px`,
    "--paper-margin": `${geometry.marginPx}px`,
    "--paper-width": `${geometry.pageBounds.width}px`,
    "--paper-zoom": paper.zoom,
  } as CSSProperties

  return (
    <div className="paper-page-shell" data-page-id={page.id} style={shellStyle}>
      <article
        className="paper-page"
        aria-label={`Preview page ${page.pageNumber} of ${pageCount}`}
        data-page-number={page.pageNumber}
        style={pageStyle}
      >
        <header className="paper-page-header">
          <span>
            Page {page.pageNumber} / {pageCount}
          </span>
          <span>{paper.label}</span>
        </header>
        <div className="paper-content-flow">
          {page.nodes.map((node) => (
            <PaperBlock
              isSelected={node.id === selectedNodeId}
              key={node.id}
              node={node}
            />
          ))}
        </div>
      </article>
    </div>
  )
}
