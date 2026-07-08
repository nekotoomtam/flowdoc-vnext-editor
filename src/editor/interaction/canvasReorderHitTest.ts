import type { NodeReorderPlacement } from "../commands/reorderPlacement"

export interface CanvasReorderHitBounds {
  bottom: number
  top: number
}

export interface CanvasReorderFlowNodeBounds extends CanvasReorderHitBounds {
  nodeId: string
}

export interface CanvasReorderFlowPlacementTarget {
  nodeId: string
  placement: NodeReorderPlacement
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

export function getCanvasReorderFlowPlacementFromBounds(
  nodeBounds: readonly CanvasReorderFlowNodeBounds[],
  y: number,
): CanvasReorderFlowPlacementTarget | null {
  const firstNodeBounds = nodeBounds[0]
  const lastNodeBounds = nodeBounds[nodeBounds.length - 1]
  if (!firstNodeBounds || !lastNodeBounds) return null

  if (y < firstNodeBounds.top) {
    return {
      nodeId: firstNodeBounds.nodeId,
      placement: "before",
    }
  }

  for (let index = 0; index < nodeBounds.length - 1; index += 1) {
    const currentBounds = nodeBounds[index]
    const nextBounds = nodeBounds[index + 1]
    if (!currentBounds || !nextBounds || nextBounds.top < currentBounds.bottom) continue
    if (y < currentBounds.bottom || y > nextBounds.top) continue

    const gapMidpoint = currentBounds.bottom + (nextBounds.top - currentBounds.bottom) / 2
    return y < gapMidpoint
      ? {
          nodeId: currentBounds.nodeId,
          placement: "after",
        }
      : {
          nodeId: nextBounds.nodeId,
          placement: "before",
        }
  }

  if (y > lastNodeBounds.bottom) {
    return {
      nodeId: lastNodeBounds.nodeId,
      placement: "after",
    }
  }

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

    const flowPlacement = getCanvasReorderFlowPlacementFromBounds(
      Array.from(flowElement.querySelectorAll<HTMLElement>(CANVAS_NODE_HIT_SELECTOR))
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            bottom: rect.bottom,
            nodeId: element.dataset.nodeId?.trim() ?? "",
            top: rect.top,
          }
        })
        .filter((bounds) => bounds.nodeId),
      y,
    )
    if (!flowPlacement) return emptyHit(x, y)

    return {
      nodeId: flowPlacement.nodeId,
      placement: flowPlacement.placement,
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
