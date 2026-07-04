import type { NodeReorderPlacement } from "../commands/reorderPlacement"

export interface CanvasReorderHitBounds {
  bottom: number
  top: number
}

export interface CanvasReorderHitTestResult {
  nodeId: string | null
  placement: NodeReorderPlacement | null
  x: number
  y: number
}

const CANVAS_NODE_HIT_SELECTOR = "[data-node-id]"

export function getCanvasReorderPlacementFromBounds(
  bounds: CanvasReorderHitBounds,
  y: number,
): NodeReorderPlacement {
  return y < bounds.top + (bounds.bottom - bounds.top) / 2 ? "before" : "after"
}

function emptyHit(x: number, y: number): CanvasReorderHitTestResult {
  return {
    nodeId: null,
    placement: null,
    x,
    y,
  }
}

function isElement(value: EventTarget | null): value is Element {
  return typeof Element !== "undefined" && value instanceof Element
}

export function hitTestCanvasReorderTarget(
  root: Element,
  target: EventTarget | null,
  x: number,
  y: number,
): CanvasReorderHitTestResult {
  if (!isElement(target) || !root.contains(target)) return emptyHit(x, y)

  const nodeElement = target.closest<HTMLElement>(CANVAS_NODE_HIT_SELECTOR)
  if (!nodeElement || !root.contains(nodeElement)) return emptyHit(x, y)

  const nodeId = nodeElement.dataset.nodeId?.trim()
  if (!nodeId) return emptyHit(x, y)

  const rect = nodeElement.getBoundingClientRect()

  return {
    nodeId,
    placement: getCanvasReorderPlacementFromBounds(rect, y),
    x,
    y,
  }
}
