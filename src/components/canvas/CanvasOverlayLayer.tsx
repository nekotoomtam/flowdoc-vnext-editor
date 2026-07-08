import { memo, useCallback, useLayoutEffect, useState, type CSSProperties, type RefObject } from "react"
import type { CanvasRenderModel } from "../../editor/render/canvasRenderModel"
import {
  areSelectionOverlayRectsEqual,
  createSelectionOverlayRect,
  type SelectionOverlayRect,
} from "../../editor/selection/selectionOverlay"

export interface CanvasOverlayLayerProps {
  isSelectionOverlaySuppressed: boolean
  renderModel: CanvasRenderModel
  selectedNodeId: string | null
  stageRef: RefObject<HTMLElement | null>
}

function findSelectedCanvasNode(
  stageElement: HTMLElement,
  selectedNodeId: string | null,
): HTMLElement | null {
  if (!selectedNodeId) return null

  return Array.from(stageElement.querySelectorAll<HTMLElement>(".paper-block[data-node-id]"))
    .find((nodeElement) => nodeElement.dataset.nodeId === selectedNodeId) ?? null
}

function getSelectionOverlayStyle(rect: SelectionOverlayRect): CSSProperties {
  return {
    "--selection-overlay-height": `${rect.height}px`,
    "--selection-overlay-left": `${rect.left}px`,
    "--selection-overlay-top": `${rect.top}px`,
    "--selection-overlay-width": `${rect.width}px`,
  } as CSSProperties
}

export const CanvasOverlayLayer = memo(function CanvasOverlayLayer({
  isSelectionOverlaySuppressed,
  renderModel,
  selectedNodeId,
  stageRef,
}: CanvasOverlayLayerProps) {
  const [selectionRect, setSelectionRect] = useState<SelectionOverlayRect | null>(null)

  const syncSelectionRect = useCallback(() => {
    const stageElement = stageRef.current
    const selectedElement = stageElement && !isSelectionOverlaySuppressed
      ? findSelectedCanvasNode(stageElement, selectedNodeId)
      : null
    const nextRect = stageElement && selectedElement
      ? createSelectionOverlayRect({
          nodeBounds: selectedElement.getBoundingClientRect(),
          nodeId: selectedNodeId,
          stageBounds: stageElement.getBoundingClientRect(),
        })
      : null

    setSelectionRect((currentRect) => (
      areSelectionOverlayRectsEqual(currentRect, nextRect) ? currentRect : nextRect
    ))
  }, [isSelectionOverlaySuppressed, selectedNodeId, stageRef])

  useLayoutEffect(() => {
    syncSelectionRect()
  }, [
    isSelectionOverlaySuppressed,
    renderModel.viewportMeasurementKey,
    selectedNodeId,
    syncSelectionRect,
  ])

  useLayoutEffect(() => {
    window.addEventListener("resize", syncSelectionRect)
    return () => window.removeEventListener("resize", syncSelectionRect)
  }, [syncSelectionRect])

  return (
    <div
      aria-hidden="true"
      className="canvas-overlay-layer"
      data-page-count={renderModel.pageCount}
      data-selected-node-id={selectedNodeId ?? ""}
    >
      {selectionRect ? (
        <span
          className="canvas-selection-outline"
          data-node-id={selectionRect.nodeId}
          style={getSelectionOverlayStyle(selectionRect)}
        />
      ) : null}
    </div>
  )
})
