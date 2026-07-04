import { memo, type CSSProperties } from "react"
import type { CanvasReorderBlockState } from "../../editor/interaction/canvasReorderDragSession"
import type { RenderNodeSummary } from "../../editor/render/renderTypes"

export interface PaperBlockProps {
  isSelected: boolean
  node: RenderNodeSummary
  reorderState: CanvasReorderBlockState
}

function getBlockPreview(node: RenderNodeSummary): string {
  if (node.renderKind === "columns") return "Columns"
  if (node.renderKind === "heading") return "Heading"
  if (node.renderKind === "page-break") return "Page break"
  if (node.renderKind === "table") return "Table"
  if (node.renderKind === "toc") return "Table of contents"
  if (node.renderKind === "paragraph") return "Paragraph"
  return node.type
}

function ColumnsPreview({ labels }: { labels: string[] }) {
  const previewLabels = labels.length > 0 ? labels.slice(0, 2) : ["Column content", "Column content"]

  return (
    <span className="paper-columns-preview" aria-hidden="true">
      {previewLabels.map((label, index) => (
        <span key={`${label}-${index}`}>
          <strong>Column {index + 1}</strong>
          <em>{label}</em>
        </span>
      ))}
    </span>
  )
}

function TablePreview({
  columnCount,
  labels,
}: {
  columnCount: number | null
  labels: string[]
}) {
  const previewLabels = labels.length > 0
    ? labels.slice(0, 9)
    : ["Segment", "Q1", "Q2", "Enterprise", "1.2M", "1.4M", "Self serve", "640K", "690K"]
  const tableStyle = {
    "--paper-table-preview-columns": Math.max(1, columnCount ?? 3),
  } as CSSProperties

  return (
    <span className="paper-table-preview" aria-hidden="true" style={tableStyle}>
      {previewLabels.map((label, index) => (
        <span key={`${label}-${index}`}>{label}</span>
      ))}
    </span>
  )
}

export const PaperBlock = memo(function PaperBlock({
  isSelected,
  node,
  reorderState,
}: PaperBlockProps) {
  return (
    <button
      className={`paper-block paper-block--${node.renderKind}`}
      data-node-id={node.id}
      data-reorder-blocked={reorderState.isBlockedTarget ? "true" : "false"}
      data-reorder-draggable={reorderState.isDraggable ? "true" : "false"}
      data-reorder-dragging={reorderState.isDragging ? "true" : "false"}
      data-reorder-placement={reorderState.placement ?? "none"}
      data-selected={isSelected ? "true" : "false"}
      type="button"
    >
      <span className="paper-block-meta">{getBlockPreview(node)}</span>
      <span className="paper-block-label">{node.label}</span>
      {node.renderKind === "columns" ? <ColumnsPreview labels={node.previewLabels} /> : null}
      {node.renderKind === "table" ? (
        <TablePreview columnCount={node.previewColumnCount} labels={node.previewLabels} />
      ) : null}
    </button>
  )
})
