import { memo } from "react"
import type { RenderNodeSummary } from "../../editor/render/renderTypes"

export interface PaperBlockProps {
  isSelected: boolean
  node: RenderNodeSummary
}

function getBlockPreview(node: RenderNodeSummary): string {
  if (node.renderKind === "columns") return "Columns"
  if (node.renderKind === "heading") return "Heading"
  if (node.renderKind === "page-break") return "Page break"
  if (node.renderKind === "table") return "Table placeholder"
  if (node.renderKind === "toc") return "Table of contents"
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

export const PaperBlock = memo(function PaperBlock({
  isSelected,
  node,
}: PaperBlockProps) {
  return (
    <button
      className={`paper-block paper-block--${node.renderKind}`}
      data-node-id={node.id}
      data-selected={isSelected ? "true" : "false"}
      type="button"
    >
      <span className="paper-block-meta">{getBlockPreview(node)}</span>
      <span className="paper-block-label">{node.label}</span>
      {node.renderKind === "table" ? <TablePreview /> : null}
    </button>
  )
})
