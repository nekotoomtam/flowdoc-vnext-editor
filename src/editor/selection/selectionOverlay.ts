export interface SelectionOverlayBounds {
  bottom: number
  left: number
  right: number
  top: number
}

export interface SelectionOverlayRect {
  height: number
  left: number
  nodeId: string
  top: number
  width: number
}

export interface CreateSelectionOverlayRectInput {
  nodeBounds: SelectionOverlayBounds
  nodeId: string | null
  stageBounds: SelectionOverlayBounds
}

function roundCssPixel(value: number): number {
  return Math.round(value * 100) / 100
}

function isFiniteBounds(bounds: SelectionOverlayBounds): boolean {
  return Number.isFinite(bounds.bottom)
    && Number.isFinite(bounds.left)
    && Number.isFinite(bounds.right)
    && Number.isFinite(bounds.top)
}

export function createSelectionOverlayRect({
  nodeBounds,
  nodeId,
  stageBounds,
}: CreateSelectionOverlayRectInput): SelectionOverlayRect | null {
  const normalizedNodeId = nodeId?.trim() ?? ""
  if (!normalizedNodeId || !isFiniteBounds(nodeBounds) || !isFiniteBounds(stageBounds)) return null

  const width = nodeBounds.right - nodeBounds.left
  const height = nodeBounds.bottom - nodeBounds.top
  if (width <= 0 || height <= 0) return null

  return {
    height: roundCssPixel(height),
    left: roundCssPixel(nodeBounds.left - stageBounds.left),
    nodeId: normalizedNodeId,
    top: roundCssPixel(nodeBounds.top - stageBounds.top),
    width: roundCssPixel(width),
  }
}

export function areSelectionOverlayRectsEqual(
  left: SelectionOverlayRect | null,
  right: SelectionOverlayRect | null,
): boolean {
  if (left === right) return true
  if (!left || !right) return false

  return left.height === right.height
    && left.left === right.left
    && left.nodeId === right.nodeId
    && left.top === right.top
    && left.width === right.width
}
