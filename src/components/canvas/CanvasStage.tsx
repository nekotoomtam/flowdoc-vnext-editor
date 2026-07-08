import { useEffect, useRef, type CSSProperties } from "react"
import { CanvasOverlayLayer } from "./CanvasOverlayLayer"
import { CanvasPageMeta } from "./CanvasPageMeta"
import { PaperPageStack } from "../paper/PaperPageStack"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import { focusCanvasNodeButton } from "../../editor/interaction/canvasNodeFocus"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"

export interface CanvasStageProps {
  canvasFocusNodeId: string | null
  canvasReorderDrag: CanvasReorderInteraction
  onCanvasFocusHandled: (nodeId: string) => void
  onKeyboardReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  onSelectNode: (nodeId: string, source: "canvas") => void
  renderModel: CanvasRenderModel
  selectedNodeId: string | null
}

export function CanvasStage({
  canvasFocusNodeId,
  canvasReorderDrag,
  onCanvasFocusHandled,
  onKeyboardReorderNode,
  onSelectNode,
  renderModel,
  selectedNodeId,
}: CanvasStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasPaperStyle = {
    "--paper-shell-width": `${renderModel.stackGeometry.pageWidthPx}px`,
    "--paper-stack-gap": `${renderModel.stackGeometry.pageGapPx}px`,
    "--paper-stack-height": `${renderModel.stackGeometry.stackHeightPx}px`,
  } as CSSProperties

  useEffect(() => {
    if (!canvasFocusNodeId) return
    if (!focusCanvasNodeButton(stageRef.current, canvasFocusNodeId)) return

    onCanvasFocusHandled(canvasFocusNodeId)
  }, [canvasFocusNodeId, onCanvasFocusHandled])

  return (
    <div className="canvas-stage" ref={stageRef} style={canvasPaperStyle}>
      <CanvasPageMeta renderModel={renderModel} />
      <PaperPageStack
        canvasReorderDrag={canvasReorderDrag}
        onKeyboardReorderNode={onKeyboardReorderNode}
        onSelectNode={onSelectNode}
        pages={renderModel.pages}
        pageCount={renderModel.pageCount}
        paper={renderModel.paper}
        selectedNodeId={selectedNodeId}
      />
      <CanvasOverlayLayer
        isSelectionOverlaySuppressed={canvasReorderDrag.dragState.status !== "idle"}
        renderModel={renderModel}
        selectedNodeId={selectedNodeId}
        stageRef={stageRef}
      />
    </div>
  )
}
