import { useMemo } from "react"
import { CanvasScrollRoot } from "./CanvasScrollRoot"
import { CanvasStage } from "./CanvasStage"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import { createCanvasRenderModel } from "../../editor/render/canvasRenderModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import type { CanvasReorderInteraction } from "../../editor/interaction/canvasReorderDragSession"
import type { ViewportScrollRootFacts } from "../../editor/viewport/viewportMeasurement"

export interface CanvasSurfaceProps {
  canvasFocusNodeId: string | null
  canvasReorderDrag: CanvasReorderInteraction
  document: CoreEditorDocumentSummary
  onCanvasFocusHandled: (nodeId: string) => void
  onKeyboardReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  onSelectNode: (nodeId: string, source: "canvas") => void
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function CanvasSurface({
  canvasFocusNodeId,
  canvasReorderDrag,
  document,
  onCanvasFocusHandled,
  onKeyboardReorderNode,
  onSelectNode,
  pages,
  paper,
  selectedNodeId,
  onViewportFactsChange,
}: CanvasSurfaceProps) {
  const renderModel = useMemo(
    () => createCanvasRenderModel({ document, pages, paper }),
    [document, pages, paper],
  )

  return (
    <CanvasScrollRoot
      measurementKey={renderModel.viewportMeasurementKey}
      onViewportFactsChange={onViewportFactsChange}
    >
      <CanvasStage
        canvasFocusNodeId={canvasFocusNodeId}
        canvasReorderDrag={canvasReorderDrag}
        onCanvasFocusHandled={onCanvasFocusHandled}
        onKeyboardReorderNode={onKeyboardReorderNode}
        onSelectNode={onSelectNode}
        renderModel={renderModel}
        selectedNodeId={selectedNodeId}
      />
    </CanvasScrollRoot>
  )
}
