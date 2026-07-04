import { useCallback, useMemo, useState } from "react"
import {
  createSiblingReorderPlacementPlan,
  type NodeReorderPlacement,
} from "../editor/commands/reorderPlacement"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import {
  finishCanvasReorderDragSession,
  getCanvasReorderBlockState,
  getReadyCanvasReorderPlan,
  IDLE_CANVAS_REORDER_DRAG_STATE,
  startCanvasReorderDragSession,
  updateCanvasReorderDragSession,
  type CanvasReorderBlockState,
  type CanvasReorderDragPointer,
  type CanvasReorderDragState,
  type CanvasReorderInteraction,
} from "../editor/interaction/canvasReorderDragSession"

export interface UseCanvasReorderDragOptions {
  editorState: EditorRuntimeState
  onReorderNodeToIndex: (nodeId: string, toIndex: number) => void
}

export type UseCanvasReorderDragResult = CanvasReorderInteraction

export function useCanvasReorderDrag({
  editorState,
  onReorderNodeToIndex,
}: UseCanvasReorderDragOptions): UseCanvasReorderDragResult {
  const [dragState, setDragState] = useState<CanvasReorderDragState>(IDLE_CANVAS_REORDER_DRAG_STATE)

  const draggableNodeIds = useMemo(() => new Set(
    editorState.view.renderableNodeIds.filter((nodeId) => (
      editorState.core.capabilities.byNodeId[nodeId]?.reorderable === true
    )),
  ), [editorState.core.capabilities.byNodeId, editorState.view.renderableNodeIds])

  const onDragStart = useCallback((nodeId: string, pointer: CanvasReorderDragPointer) => {
    if (!draggableNodeIds.has(nodeId)) {
      setDragState(IDLE_CANVAS_REORDER_DRAG_STATE)
      return false
    }

    setDragState(startCanvasReorderDragSession(nodeId, pointer))
    return true
  }, [draggableNodeIds])

  const onDragOver = useCallback((
    targetNodeId: string,
    placement: NodeReorderPlacement,
    pointer: CanvasReorderDragPointer,
  ) => {
    setDragState((currentState) => {
      if (currentState.status !== "dragging") return currentState

      return updateCanvasReorderDragSession(
        currentState,
        createSiblingReorderPlacementPlan(editorState, {
          nodeId: currentState.nodeId,
          placement,
          targetNodeId,
        }),
        pointer,
      )
    })
  }, [editorState])

  const onDragEnd = useCallback(() => {
    setDragState(finishCanvasReorderDragSession())
  }, [])

  const onDrop = useCallback((
    targetNodeId: string,
    placement: NodeReorderPlacement,
    pointer: CanvasReorderDragPointer,
  ) => {
    if (dragState.status !== "dragging") return

    const updatedState = updateCanvasReorderDragSession(
      dragState,
      createSiblingReorderPlacementPlan(editorState, {
        nodeId: dragState.nodeId,
        placement,
        targetNodeId,
      }),
      pointer,
    )
    const readyPlan = getReadyCanvasReorderPlan(updatedState)

    setDragState(finishCanvasReorderDragSession())

    if (readyPlan) {
      onReorderNodeToIndex(readyPlan.nodeId, readyPlan.toIndex)
    }
  }, [dragState, editorState, onReorderNodeToIndex])

  const getBlockState = useCallback((nodeId: string): CanvasReorderBlockState => {
    return getCanvasReorderBlockState({
      dragState,
      isDraggable: draggableNodeIds.has(nodeId),
      nodeId,
    })
  }, [dragState, draggableNodeIds])

  return {
    dragState,
    getBlockState,
    onDragEnd,
    onDragOver,
    onDragStart,
    onDrop,
  }
}
