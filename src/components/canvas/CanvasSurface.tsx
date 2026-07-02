import { useMemo } from "react"
import { CanvasScrollRoot } from "./CanvasScrollRoot"
import { CanvasStage } from "./CanvasStage"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import { createCanvasRenderModel } from "../../editor/render/canvasRenderModel"
import type { RenderPageSummary } from "../../editor/render/renderTypes"
import type { ViewportScrollRootFacts } from "../../editor/viewport/viewportMeasurement"

export interface CanvasSurfaceProps {
  document: CoreEditorDocumentSummary
  onSelectNode: (nodeId: string, source: "canvas") => void
  pages: RenderPageSummary[]
  paper: PaperModel
  selectedNodeId: string | null
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function CanvasSurface({
  document,
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
        onSelectNode={onSelectNode}
        renderModel={renderModel}
        selectedNodeId={selectedNodeId}
      />
    </CanvasScrollRoot>
  )
}
