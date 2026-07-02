export interface HitTestResult {
  nodeId: string | null
  x: number
  y: number
}

export interface HitTestNodeBounds {
  bottom: number
  left: number
  nodeId: string
  right: number
  top: number
}

export interface HitTestNodeBoundsInput {
  nodeBounds: HitTestNodeBounds[]
  x: number
  y: number
}

const CANVAS_NODE_HIT_SELECTOR = "[data-node-id]"

export function createEmptyHitTest(x = 0, y = 0): HitTestResult {
  return {
    nodeId: null,
    x,
    y,
  }
}

function createNodeHitTest(nodeId: string, x: number, y: number): HitTestResult {
  const normalizedNodeId = nodeId.trim()
  if (!normalizedNodeId) return createEmptyHitTest(x, y)

  return {
    nodeId: normalizedNodeId,
    x,
    y,
  }
}

function isPointInBounds(bounds: HitTestNodeBounds, x: number, y: number): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
}

export function hitTestNodeBoundsAtPoint({
  nodeBounds,
  x,
  y,
}: HitTestNodeBoundsInput): HitTestResult {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return createEmptyHitTest()

  for (let index = nodeBounds.length - 1; index >= 0; index -= 1) {
    const bounds = nodeBounds[index]
    if (isPointInBounds(bounds, x, y)) {
      return createNodeHitTest(bounds.nodeId, x, y)
    }
  }

  return createEmptyHitTest(x, y)
}

function isElement(value: EventTarget | null): value is Element {
  return typeof Element !== "undefined" && value instanceof Element
}

export function hitTestCanvasNodeTarget(
  root: Element,
  target: EventTarget | null,
  x: number,
  y: number,
): HitTestResult {
  if (!isElement(target) || !root.contains(target)) return createEmptyHitTest(x, y)

  const nodeElement = target.closest<HTMLElement>(CANVAS_NODE_HIT_SELECTOR)
  if (!nodeElement || !root.contains(nodeElement)) return createEmptyHitTest(x, y)

  return createNodeHitTest(nodeElement.dataset.nodeId ?? "", x, y)
}
