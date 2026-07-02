import { memo } from "react"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"

export interface CanvasOverlayLayerProps {
  renderModel: CanvasRenderModel
  selectedNodeId: string | null
}

export const CanvasOverlayLayer = memo(function CanvasOverlayLayer({
  renderModel,
  selectedNodeId,
}: CanvasOverlayLayerProps) {
  return (
    <div
      aria-hidden="true"
      className="canvas-overlay-layer"
      data-page-count={renderModel.pageCount}
      data-selected-node-id={selectedNodeId ?? ""}
    />
  )
})
