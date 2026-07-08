import type {
  NodeReorderPlacement,
  SiblingReorderInsertionSlot,
  SiblingReorderPlacementPlan,
} from "../commands/reorderPlacement"

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
  isNoopTarget: boolean
  placement: NodeReorderPlacement | null
  reason: string | null
  targetState: "blocked" | "idle" | "noop" | "ready"
}

export interface CanvasReorderInteraction {
  dragState: CanvasReorderDragState
  getActiveInsertionSlot: () => SiblingReorderInsertionSlot | null
  getBlockState: (nodeId: string) => CanvasReorderBlockState
  onDragEnd: () => void
  onDragOver: (targetNodeId: string, placement: NodeReorderPlacement, pointer: CanvasReorderDragPointer) => void
  onDragStart: (nodeId: string, pointer: CanvasReorderDragPointer) => boolean
  onDrop: (targetNodeId: string, placement: NodeReorderPlacement, pointer: CanvasReorderDragPointer) => void
}

export interface CanvasReorderBlockStateInput {
  dragState: CanvasReorderDragState
  isDraggable: boolean
  nodeId: string
}

export const IDLE_CANVAS_REORDER_DRAG_STATE: CanvasReorderDragState = {
  status: "idle",
}

export const IDLE_CANVAS_REORDER_BLOCK_STATE: CanvasReorderBlockState = {
  isBlockedTarget: false,
  isDragging: false,
  isDraggable: false,
  isNoopTarget: false,
  placement: null,
  reason: null,
  targetState: "idle",
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

export function getActiveCanvasReorderInsertionSlot(
  state: CanvasReorderDragState,
): SiblingReorderInsertionSlot | null {
  return getReadyCanvasReorderPlan(state)?.slot ?? null
}

export function getCanvasReorderBlockState({
  dragState,
  isDraggable,
  nodeId,
}: CanvasReorderBlockStateInput): CanvasReorderBlockState {
  if (dragState.status !== "dragging") {
    return isDraggable
      ? {
          ...IDLE_CANVAS_REORDER_BLOCK_STATE,
          isDraggable,
        }
      : IDLE_CANVAS_REORDER_BLOCK_STATE
  }

  const plan = dragState.plan
  const isTarget = plan?.targetNodeId === nodeId
  const targetState = isTarget && plan?.status !== "ready" ? plan?.status ?? "idle" : "idle"
  const reason = isTarget && plan?.status !== "ready" ? plan?.reason ?? null : null

  return {
    isBlockedTarget: targetState === "blocked",
    isDragging: dragState.nodeId === nodeId,
    isDraggable,
    isNoopTarget: targetState === "noop",
    placement: null,
    reason,
    targetState,
  }
}
