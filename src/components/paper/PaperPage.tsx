import type { CSSProperties } from "react"
import { getPaperBounds } from "../../editor/paper/paperGeometry"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderNodeSummary, RenderPageSummary } from "../../editor/render/renderTypes"

export interface PaperPageProps {
  onSelectNode: (nodeId: string, source: "canvas") => void
  page: RenderPageSummary
  pageCount: number
  paper: PaperModel
  selectedNodeId: string | null
}

function getBlockPreview(node: RenderNodeSummary): string {
  if (node.renderKind === "heading") return "Heading"
  if (node.renderKind === "table") return "Table placeholder"
  if (node.renderKind === "paragraph") return "Paragraph"
  return node.type
}

function TablePreview() {
  return (
    <span className="paper-table-preview" aria-hidden="true">
      <span>Segment</span>
      <span>Q1</span>
      <span>Q2</span>
      <span>Enterprise</span>
      <span>1.2M</span>
      <span>1.4M</span>
      <span>Self serve</span>
      <span>640K</span>
      <span>690K</span>
    </span>
  )
}

export function PaperPage({
  onSelectNode,
  page,
  pageCount,
  paper,
  selectedNodeId,
}: PaperPageProps) {
  const bounds = getPaperBounds(paper)
  const shellStyle = {
    "--paper-shell-height": `${bounds.height}px`,
    "--paper-shell-width": `${bounds.width}px`,
  } as CSSProperties
  const pageStyle = {
    "--paper-height": `${paper.heightPx}px`,
    "--paper-margin": `${paper.marginPx}px`,
    "--paper-width": `${paper.widthPx}px`,
    "--paper-zoom": paper.zoom,
  } as CSSProperties

  return (
    <div className="paper-page-shell" style={shellStyle}>
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
            <button
              className={`paper-block paper-block--${node.renderKind}`}
              data-node-id={node.id}
              data-selected={node.id === selectedNodeId ? "true" : "false"}
              key={node.id}
              onClick={() => onSelectNode(node.id, "canvas")}
              type="button"
            >
              <span className="paper-block-meta">{getBlockPreview(node)}</span>
              <span className="paper-block-label">{node.label}</span>
              {node.renderKind === "table" ? <TablePreview /> : null}
            </button>
          ))}
        </div>
      </article>
    </div>
  )
}
