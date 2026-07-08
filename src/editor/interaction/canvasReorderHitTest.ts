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
const CANVAS_CONTENT_FLOW_SELECTOR = ".paper-content-flow"
const CANVAS_REORDER_SLOT_SELECTOR = "[data-reorder-slot-target-id][data-reorder-slot-placement]"

export function getCanvasReorderPlacementFromBounds(
  bounds: CanvasReorderHitBounds,
  y: number,
): NodeReorderPlacement {
  return y < bounds.top + (bounds.bottom - bounds.top) / 2 ? "before" : "after"
}

export function getCanvasReorderEdgePlacementFromBounds(
  firstNodeBounds: CanvasReorderHitBounds | null,
  lastNodeBounds: CanvasReorderHitBounds | null,
  y: number,
): NodeReorderPlacement | null {
  if (!firstNodeBounds || !lastNodeBounds) return null
  if (y < firstNodeBounds.top) return "before"
  if (y > lastNodeBounds.bottom) return "after"
  return null
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

export function normalizeCanvasReorderPlacement(value: string | undefined): NodeReorderPlacement | null {
  return value === "before" || value === "after" ? value : null
}

export function hitTestCanvasReorderTarget(
  root: Element,
  target: EventTarget | null,
  x: number,
  y: number,
): CanvasReorderHitTestResult {
  if (!isElement(target) || !root.contains(target)) return emptyHit(x, y)

  const slotElement = target.closest<HTMLElement>(CANVAS_REORDER_SLOT_SELECTOR)
  if (slotElement && root.contains(slotElement)) {
    const nodeId = slotElement.dataset.reorderSlotTargetId?.trim() ?? ""
    const placement = normalizeCanvasReorderPlacement(slotElement.dataset.reorderSlotPlacement)

    if (nodeId && placement) {
      return {
        nodeId,
        placement,
        x,
        y,
      }
    }
  }

  const nodeElement = target.closest<HTMLElement>(CANVAS_NODE_HIT_SELECTOR)
  if (!nodeElement || !root.contains(nodeElement)) {
    const flowElement = target.closest<HTMLElement>(CANVAS_CONTENT_FLOW_SELECTOR)
    if (!flowElement || !root.contains(flowElement)) return emptyHit(x, y)

    const nodeElements = Array.from(flowElement.querySelectorAll<HTMLElement>(CANVAS_NODE_HIT_SELECTOR))
    const firstNodeElement = nodeElements[0]
    const lastNodeElement = nodeElements[nodeElements.length - 1]
    if (!firstNodeElement || !lastNodeElement) return emptyHit(x, y)

    const placement = getCanvasReorderEdgePlacementFromBounds(
      firstNodeElement.getBoundingClientRect(),
      lastNodeElement.getBoundingClientRect(),
      y,
    )
    if (!placement) return emptyHit(x, y)

    const targetNodeElement = placement === "before" ? firstNodeElement : lastNodeElement
    const nodeId = targetNodeElement.dataset.nodeId?.trim()
    if (!nodeId) return emptyHit(x, y)

    return {
      nodeId,
      placement,
      x,
      y,
    }
  }

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
