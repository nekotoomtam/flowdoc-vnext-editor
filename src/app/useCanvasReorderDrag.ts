import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createSiblingReorderPlacementPlan,
  type NodeReorderPlacement,
} from "../editor/commands/reorderPlacement"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import {
  commitCanvasReorderDragSession,
  finishCanvasReorderDragSession,
  getActiveCanvasReorderInsertionSlot,
  getActiveCanvasReorderPreviewSiblingIds,
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
import type { RuntimeNodeMutationStatus } from "../editor/runtime/runtimeMutationStatus"

export interface UseCanvasReorderDragOptions {
  editorState: EditorRuntimeState
  mutationStatus: RuntimeNodeMutationStatus
  onReorderNodeToIndex: (nodeId: string, toIndex: number) => void
}

export type UseCanvasReorderDragResult = CanvasReorderInteraction

export function useCanvasReorderDrag({
  editorState,
  mutationStatus,
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
      if (targetNodeId === currentState.nodeId) {
        return updateCanvasReorderDragSession(currentState, currentState.plan, pointer)
      }

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

    const placementPlan = targetNodeId === dragState.nodeId
      ? dragState.plan
      : createSiblingReorderPlacementPlan(editorState, {
          nodeId: dragState.nodeId,
          placement,
          targetNodeId,
        })
    const updatedState = updateCanvasReorderDragSession(
      dragState,
      placementPlan,
      pointer,
    )
    const readyPlan = getReadyCanvasReorderPlan(updatedState)

    setDragState(readyPlan ? commitCanvasReorderDragSession(updatedState) : finishCanvasReorderDragSession())

    if (readyPlan) {
      onReorderNodeToIndex(readyPlan.nodeId, readyPlan.toIndex)
    }
  }, [dragState, editorState, onReorderNodeToIndex])

  useEffect(() => {
    if (dragState.status !== "committing" || mutationStatus.status === "pending") return
    setDragState(finishCanvasReorderDragSession())
  }, [dragState.status, mutationStatus.status])

  const getBlockState = useCallback((nodeId: string): CanvasReorderBlockState => {
    return getCanvasReorderBlockState({
      dragState,
      isDraggable: draggableNodeIds.has(nodeId),
      nodeId,
    })
  }, [dragState, draggableNodeIds])

  const getActiveInsertionSlot = useCallback(() => (
    getActiveCanvasReorderInsertionSlot(dragState)
  ), [dragState])

  const getActivePreviewSiblingIds = useCallback(() => (
    getActiveCanvasReorderPreviewSiblingIds(dragState)
  ), [dragState])

  return {
    dragState,
    getActiveInsertionSlot,
    getActivePreviewSiblingIds,
    getBlockState,
    onDragEnd,
    onDragOver,
    onDragStart,
    onDrop,
  }
}
