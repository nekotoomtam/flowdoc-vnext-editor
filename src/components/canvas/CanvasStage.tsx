import { useRef, type CSSProperties } from "react"
import { CanvasOverlayLayer } from "./CanvasOverlayLayer"
import { CanvasPageMeta } from "./CanvasPageMeta"
import { PaperPageStack } from "../paper/PaperPageStack"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"

export interface CanvasStageProps {
  canvasReorderDrag: CanvasReorderInteraction
  onSelectNode: (nodeId: string, source: "canvas") => void
  renderModel: CanvasRenderModel
  selectedNodeId: string | null
}

export function CanvasStage({
  canvasReorderDrag,
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

  return (
    <div className="canvas-stage" ref={stageRef} style={canvasPaperStyle}>
      <CanvasPageMeta renderModel={renderModel} />
      <PaperPageStack
        canvasReorderDrag={canvasReorderDrag}
        onSelectNode={onSelectNode}
        pages={renderModel.pages}
        pageCount={renderModel.pageCount}
        paper={renderModel.paper}
        selectedNodeId={selectedNodeId}
      />
      <CanvasOverlayLayer
        renderModel={renderModel}
        selectedNodeId={selectedNodeId}
        stageRef={stageRef}
      />
    </div>
  )
}
