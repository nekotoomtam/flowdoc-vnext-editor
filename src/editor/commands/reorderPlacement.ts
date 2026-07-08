import type { EditorRuntimeState } from "../runtime/editorState"
import { resolveCommandNodeTarget } from "./commandTargets"
import type { NodeReorderDirection } from "./commandTypes"

export type NodeReorderPlacement = "after" | "before"

export interface SiblingReorderPlacementInput {
  nodeId: string
  placement: NodeReorderPlacement
  targetNodeId: string
}

export interface SiblingReorderInsertionSlot {
  afterNodeId: string | null
  beforeNodeId: string | null
  containerId: string
  insertIndex: number
  scope: "body-flow"
}

export interface SiblingReorderPlacementReadyPlan {
  fromIndex: number
  nodeId: string
  parentId: string
  placement: NodeReorderPlacement
  previewSiblingIds: string[]
  siblingIds: string[]
  slot: SiblingReorderInsertionSlot
  status: "ready"
  targetNodeId: string
  toIndex: number
}

export interface SiblingReorderPlacementBlockedPlan {
  nodeId: string | null
  placement: NodeReorderPlacement
  reason: string
  status: "blocked"
  targetNodeId: string | null
}

export interface SiblingReorderPlacementNoopPlan {
  nodeId: string
  placement: NodeReorderPlacement
  reason: string
  status: "noop"
  targetNodeId: string
}

export type SiblingReorderPlacementPlan =
  | SiblingReorderPlacementBlockedPlan
  | SiblingReorderPlacementNoopPlan
  | SiblingReorderPlacementReadyPlan

interface ResolvedSurfaceNode {
  nodeId: string
}

function blockedPlan(
  input: SiblingReorderPlacementInput,
  reason: string,
  nodeId: string | null = null,
  targetNodeId: string | null = null,
): SiblingReorderPlacementBlockedPlan {
  return {
    nodeId,
    placement: input.placement,
    reason,
    status: "blocked",
    targetNodeId,
  }
}

function resolveSurfaceNode(
  state: EditorRuntimeState,
  nodeId: string,
  label: "dragged" | "drop target",
): ResolvedSurfaceNode | string {
  const target = resolveCommandNodeTarget(state, nodeId)

  if (!target.inputNodeExists) {
    return `${label === "dragged" ? "Dragged node" : "Drop target"} is unknown: ${nodeId}`
  }
  if (!target.nodeId) {
    return `${label === "dragged" ? "Dragged node" : "Drop target"} does not resolve to an operation surface: ${nodeId}`
  }
  if (!target.capabilities?.selectable) {
    return `${label === "dragged" ? "Dragged operation surface" : "Drop target surface"} is not selectable: ${target.nodeId}`
  }
  if (label === "dragged" && !target.capabilities.reorderable) {
    return `Dragged operation surface cannot be reordered: ${target.nodeId}`
  }

  return {
    nodeId: target.nodeId,
  }
}

function previewSiblingOrder(siblingIds: string[], nodeId: string, toIndex: number): string[] {
  const nextSiblingIds = siblingIds.filter((siblingId) => siblingId !== nodeId)
  nextSiblingIds.splice(toIndex, 0, nodeId)
  return nextSiblingIds
}

function createSiblingInsertionSlot(
  parentId: string,
  siblingIdsWithoutSource: readonly string[],
  insertIndex: number,
): SiblingReorderInsertionSlot {
  return {
    afterNodeId: siblingIdsWithoutSource[insertIndex - 1] ?? null,
    beforeNodeId: siblingIdsWithoutSource[insertIndex] ?? null,
    containerId: parentId,
    insertIndex,
    scope: "body-flow",
  }
}

export function createSiblingReorderPlacementPlan(
  state: EditorRuntimeState,
  input: SiblingReorderPlacementInput,
): SiblingReorderPlacementPlan {
  const source = resolveSurfaceNode(state, input.nodeId, "dragged")
  if (typeof source === "string") return blockedPlan(input, source)

  const target = resolveSurfaceNode(state, input.targetNodeId, "drop target")
  if (typeof target === "string") return blockedPlan(input, target, source.nodeId)

  if (source.nodeId === target.nodeId) {
    return {
      nodeId: source.nodeId,
      placement: input.placement,
      reason: "Cannot drop a node onto itself.",
      status: "noop",
      targetNodeId: target.nodeId,
    }
  }

  const sourceParentId = state.view.parentById[source.nodeId] ?? null
  const targetParentId = state.view.parentById[target.nodeId] ?? null

  if (!sourceParentId) return blockedPlan(input, "Dragged node is missing a parent.", source.nodeId, target.nodeId)
  if (!targetParentId) return blockedPlan(input, "Drop target is missing a parent.", source.nodeId, target.nodeId)
  if (sourceParentId !== targetParentId) {
    return blockedPlan(
      input,
      "Drag/drop reorder is limited to siblings in the same parent.",
      source.nodeId,
      target.nodeId,
    )
  }

  const siblingIds = state.view.childrenById[sourceParentId] ?? []
  const fromIndex = siblingIds.indexOf(source.nodeId)
  const targetIndex = siblingIds.indexOf(target.nodeId)

  if (fromIndex < 0) {
    return blockedPlan(input, "Parent list does not contain dragged node.", source.nodeId, target.nodeId)
  }
  if (targetIndex < 0) {
    return blockedPlan(input, "Parent list does not contain drop target.", source.nodeId, target.nodeId)
  }

  const siblingIdsWithoutSource = siblingIds.filter((siblingId) => siblingId !== source.nodeId)
  const targetIndexAfterRemoval = siblingIdsWithoutSource.indexOf(target.nodeId)
  const toIndex = input.placement === "before"
    ? targetIndexAfterRemoval
    : targetIndexAfterRemoval + 1

  if (toIndex === fromIndex) {
    return {
      nodeId: source.nodeId,
      placement: input.placement,
      reason: "Drop placement is already current sibling order.",
      status: "noop",
      targetNodeId: target.nodeId,
    }
  }

  return {
    fromIndex,
    nodeId: source.nodeId,
    parentId: sourceParentId,
    placement: input.placement,
    previewSiblingIds: previewSiblingOrder(siblingIds, source.nodeId, toIndex),
    siblingIds: [...siblingIds],
    slot: createSiblingInsertionSlot(sourceParentId, siblingIdsWithoutSource, toIndex),
    status: "ready",
    targetNodeId: target.nodeId,
    toIndex,
  }
}

export function createAdjacentSiblingReorderPlan(
  state: EditorRuntimeState,
  nodeId: string,
  direction: NodeReorderDirection,
): SiblingReorderPlacementPlan {
  const source = resolveSurfaceNode(state, nodeId, "dragged")
  const placement = direction === "up" ? "before" : "after"
  const input: SiblingReorderPlacementInput = {
    nodeId,
    placement,
    targetNodeId: nodeId,
  }

  if (typeof source === "string") return blockedPlan(input, source)

  const parentId = state.view.parentById[source.nodeId] ?? null
  if (!parentId) return blockedPlan(input, "Dragged node is missing a parent.", source.nodeId)

  const siblingIds = state.view.childrenById[parentId] ?? []
  const fromIndex = siblingIds.indexOf(source.nodeId)
  if (fromIndex < 0) return blockedPlan(input, "Parent list does not contain dragged node.", source.nodeId)

  const targetIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1
  const targetNodeId = siblingIds[targetIndex]
  if (!targetNodeId) {
    return blockedPlan(
      input,
      direction === "up"
        ? "Dragged node is already first in its parent."
        : "Dragged node is already last in its parent.",
      source.nodeId,
    )
  }

  return createSiblingReorderPlacementPlan(state, {
    nodeId: source.nodeId,
    placement,
    targetNodeId,
  })
}

export function createCanvasAdjacentSiblingReorderPlan(
  state: EditorRuntimeState,
  nodeId: string,
  direction: NodeReorderDirection,
): SiblingReorderPlacementPlan {
  const source = resolveSurfaceNode(state, nodeId, "dragged")
  const placement = direction === "up" ? "before" : "after"
  const input: SiblingReorderPlacementInput = {
    nodeId,
    placement,
    targetNodeId: nodeId,
  }

  if (typeof source === "string") return blockedPlan(input, source)

  const canvasSurfaceNodeIds = state.view.presentation.canvasSurfaceNodeIds
  const fromCanvasIndex = canvasSurfaceNodeIds.indexOf(source.nodeId)
  if (fromCanvasIndex < 0) {
    return blockedPlan(input, "Canvas order does not contain dragged node.", source.nodeId)
  }

  const targetCanvasIndex = direction === "up" ? fromCanvasIndex - 1 : fromCanvasIndex + 1
  const targetNodeId = canvasSurfaceNodeIds[targetCanvasIndex]
  if (!targetNodeId) {
    return blockedPlan(
      input,
      direction === "up"
        ? "Dragged node is already first in the canvas order."
        : "Dragged node is already last in the canvas order.",
      source.nodeId,
    )
  }

  return createSiblingReorderPlacementPlan(state, {
    nodeId: source.nodeId,
    placement,
    targetNodeId,
  })
}
