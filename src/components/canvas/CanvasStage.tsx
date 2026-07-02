import type { CSSProperties } from "react"
import { CanvasOverlayLayer } from "./CanvasOverlayLayer"
import { CanvasPageMeta } from "./CanvasPageMeta"
import { PaperPageStack } from "../paper/PaperPageStack"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"

export interface CanvasStageProps {
  onSelectNode: (nodeId: string, source: "canvas") => void
  renderModel: CanvasRenderModel
  selectedNodeId: string | null
}

export function CanvasStage({
  onSelectNode,
  renderModel,
  selectedNodeId,
}: CanvasStageProps) {
  const canvasPaperStyle = {
    "--paper-shell-width": `${renderModel.stackGeometry.pageWidthPx}px`,
    "--paper-stack-gap": `${renderModel.stackGeometry.pageGapPx}px`,
    "--paper-stack-height": `${renderModel.stackGeometry.stackHeightPx}px`,
  } as CSSProperties

  return (
    <div className="canvas-stage" style={canvasPaperStyle}>
      <CanvasPageMeta renderModel={renderModel} />
      <PaperPageStack
        onSelectNode={onSelectNode}
        pages={renderModel.pages}
        pageCount={renderModel.pageCount}
        paper={renderModel.paper}
        selectedNodeId={selectedNodeId}
      />
      <CanvasOverlayLayer renderModel={renderModel} selectedNodeId={selectedNodeId} />
    </div>
  )
}
