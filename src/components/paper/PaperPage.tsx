import type { CSSProperties } from "react"
import { PaperBlock } from "./PaperBlock"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import { getPaperPreviewFlowMetrics } from "../../editor/paper/paperFlowMetrics"
import { getPaperPageGeometry } from "../../editor/paper/paperGeometry"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderNodeSummary, RenderPageSummary } from "../../editor/render/renderTypes"
import type { NodeReorderPlacement, SiblingReorderInsertionSlot } from "../../editor/commands/reorderPlacement"

interface PaperReorderSlotProps {
  placement: NodeReorderPlacement
  slot: SiblingReorderInsertionSlot
  targetNodeId: string
}

function PaperReorderSlot({ placement, slot, targetNodeId }: PaperReorderSlotProps) {
  return (
    <div
      aria-hidden="true"
      className="paper-reorder-slot"
      data-reorder-slot-after-id={slot.afterNodeId ?? ""}
      data-reorder-slot-before-id={slot.beforeNodeId ?? ""}
      data-reorder-slot-container-id={slot.containerId}
      data-reorder-slot-index={slot.insertIndex}
      data-reorder-slot-placement={placement}
      data-reorder-slot-scope={slot.scope}
      data-reorder-slot-target-id={targetNodeId}
    >
      <span />
    </div>
  )
}

function getActiveSlotPlacementForNode(
  slot: SiblingReorderInsertionSlot | null,
  nodeId: string,
): NodeReorderPlacement | null {
  if (!slot) return null
  if (slot.beforeNodeId === nodeId) return "before"
  if (slot.beforeNodeId === null && slot.afterNodeId === nodeId) return "after"
  return null
}

function getPreviewOrderedNodes(
  nodes: readonly RenderNodeSummary[],
  previewSiblingIds: readonly string[] | null,
): readonly RenderNodeSummary[] {
  if (!previewSiblingIds) return nodes

  const previewIndexById = new Map(previewSiblingIds.map((nodeId, index) => [nodeId, index]))
  if (!nodes.some((node) => previewIndexById.has(node.id))) return nodes

  return [...nodes].sort((left, right) => {
    const leftIndex = previewIndexById.get(left.id)
    const rightIndex = previewIndexById.get(right.id)

    if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex
    if (leftIndex !== undefined) return -1
    if (rightIndex !== undefined) return 1
    return 0
  })
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
  const flowMetrics = getPaperPreviewFlowMetrics({
    flowCapacityPx: page.flowCapacityPx,
    paper,
  })
  const flowStyle = {
    "--paper-flow-block-gap": `${flowMetrics.blockGapPx}px`,
    "--paper-flow-capacity": `${flowMetrics.flowCapacityPx}px`,
    "--paper-flow-estimated-content-height": `${page.estimatedContentHeightPx}px`,
    "--paper-flow-padding-block": `${flowMetrics.flowPaddingBlockPx}px`,
  } as CSSProperties
  const activeSlot = canvasReorderDrag.getActiveInsertionSlot()
  const activePreviewSiblingIds = canvasReorderDrag.getActivePreviewSiblingIds()
  const previewNodes = getPreviewOrderedNodes(page.nodes, activePreviewSiblingIds)
  const shouldRenderInsertionSlot = !activePreviewSiblingIds

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
        <div
          className="paper-content-flow"
          data-estimated-content-height-px={page.estimatedContentHeightPx}
          data-flow-capacity-px={flowMetrics.flowCapacityPx}
          style={flowStyle}
        >
          {previewNodes.map((node) => {
            const reorderState = canvasReorderDrag.getBlockState(node.id)
            const slotPlacement = getActiveSlotPlacementForNode(activeSlot, node.id)

            return (
              <div className="paper-flow-item" data-node-flow-item-id={node.id} key={node.id}>
                {slotPlacement === "before" && activeSlot && shouldRenderInsertionSlot ? (
                  <PaperReorderSlot placement="before" slot={activeSlot} targetNodeId={node.id} />
                ) : null}
                <PaperBlock
                  isSelected={node.id === selectedNodeId}
                  node={node}
                  onKeyboardReorderNode={onKeyboardReorderNode}
                  reorderState={reorderState}
                />
                {slotPlacement === "after" && activeSlot && shouldRenderInsertionSlot ? (
                  <PaperReorderSlot placement="after" slot={activeSlot} targetNodeId={node.id} />
                ) : null}
              </div>
            )
          })}
        </div>
      </article>
    </div>
  )
}
