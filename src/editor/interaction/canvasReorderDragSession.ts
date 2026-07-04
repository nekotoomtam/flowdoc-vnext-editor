import type { NodeReorderPlacement, SiblingReorderPlacementPlan } from "../commands/reorderPlacement"

export interface CanvasReorderDragPointer {
  x: number
  y: number
}

export type CanvasReorderDragState =
  | {
      status: "idle"
    }
  | {
      nodeId: string
      plan: SiblingReorderPlacementPlan | null
      pointer: CanvasReorderDragPointer
      status: "dragging"
    }

export interface CanvasReorderBlockState {
  isBlockedTarget: boolean
  isDragging: boolean
  isDraggable: boolean
  placement: NodeReorderPlacement | null
}

export interface CanvasReorderInteraction {
  dragState: CanvasReorderDragState
  getBlockState: (nodeId: string) => CanvasReorderBlockState
  onDragEnd: () => void
  onDragOver: (targetNodeId: string, placement: NodeReorderPlacement, pointer: CanvasReorderDragPointer) => void
  onDragStart: (nodeId: string, pointer: CanvasReorderDragPointer) => boolean
  onDrop: (targetNodeId: string, placement: NodeReorderPlacement, pointer: CanvasReorderDragPointer) => void
}

export const IDLE_CANVAS_REORDER_DRAG_STATE: CanvasReorderDragState = {
  status: "idle",
}

export function startCanvasReorderDragSession(
  nodeId: string,
  pointer: CanvasReorderDragPointer,
): CanvasReorderDragState {
  return {
    nodeId,
    plan: null,
    pointer,
    status: "dragging",
  }
}

export function updateCanvasReorderDragSession(
  state: CanvasReorderDragState,
  plan: SiblingReorderPlacementPlan | null,
  pointer: CanvasReorderDragPointer,
): CanvasReorderDragState {
  if (state.status !== "dragging") return state

  return {
    ...state,
    plan,
    pointer,
  }
}

export function finishCanvasReorderDragSession(): CanvasReorderDragState {
  return IDLE_CANVAS_REORDER_DRAG_STATE
}

export function getReadyCanvasReorderPlan(
  state: CanvasReorderDragState,
): Extract<SiblingReorderPlacementPlan, { status: "ready" }> | null {
  return state.status === "dragging" && state.plan?.status === "ready" ? state.plan : null
}
