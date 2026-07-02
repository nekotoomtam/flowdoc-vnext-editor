import { memo } from "react"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"

export interface CanvasPageMetaProps {
  renderModel: CanvasRenderModel
}

export const CanvasPageMeta = memo(function CanvasPageMeta({ renderModel }: CanvasPageMetaProps) {
  return (
    <div className="canvas-page-meta" aria-label="Current page summary">
      <span>{renderModel.documentTitle}</span>
      <span>
        {renderModel.pageCount} preview pages / {renderModel.paper.label} / {renderModel.paperSizeLabel}
      </span>
    </div>
  )
})
