import type { CSSProperties } from "react"
import { PaperBlock } from "./PaperBlock"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import { getPaperPageGeometry } from "../../editor/paper/paperGeometry"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import type { NodeReorderPlacement } from "../../editor/commands/reorderPlacement"

interface PaperReorderSlotProps {
  placement: NodeReorderPlacement
  targetNodeId: string
}

function PaperReorderSlot({ placement, targetNodeId }: PaperReorderSlotProps) {
  return (
    <div
      aria-hidden="true"
      className="paper-reorder-slot"
      data-reorder-slot-placement={placement}
      data-reorder-slot-target-id={targetNodeId}
    >
      <span />
    </div>
  )
}

export interface PaperPageProps {
  canvasReorderDrag: CanvasReorderInteraction
  onKeyboardReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  page: RenderPageSummary
  pageCount: number
  paper: PaperModel
  selectedNodeId: string | null
}

export function PaperPage({
  canvasReorderDrag,
  onKeyboardReorderNode,
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
          {page.nodes.map((node) => {
            const reorderState = canvasReorderDrag.getBlockState(node.id)

            return (
              <div className="paper-flow-item" data-node-flow-item-id={node.id} key={node.id}>
                {reorderState.placement === "before" ? (
                  <PaperReorderSlot placement="before" targetNodeId={node.id} />
                ) : null}
                <PaperBlock
                  isSelected={node.id === selectedNodeId}
                  node={node}
                  onKeyboardReorderNode={onKeyboardReorderNode}
                  reorderState={reorderState}
                />
                {reorderState.placement === "after" ? (
                  <PaperReorderSlot placement="after" targetNodeId={node.id} />
                ) : null}
              </div>
            )
          })}
        </div>
      </article>
    </div>
  )
}
