export interface CanvasReorderAutoScrollInput {
  edgeSizePx?: number
  maxStepPx?: number
  pointerY: number
  rootBottom: number
  rootTop: number
}

const DEFAULT_AUTO_SCROLL_EDGE_PX = 72
const DEFAULT_AUTO_SCROLL_MAX_STEP_PX = 18

function clampScrollRatio(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function getCanvasReorderAutoScrollDelta({
  edgeSizePx = DEFAULT_AUTO_SCROLL_EDGE_PX,
  maxStepPx = DEFAULT_AUTO_SCROLL_MAX_STEP_PX,
  pointerY,
  rootBottom,
  rootTop,
}: CanvasReorderAutoScrollInput): number {
  if (!Number.isFinite(pointerY) || !Number.isFinite(rootBottom) || !Number.isFinite(rootTop)) return 0
  if (edgeSizePx <= 0 || maxStepPx <= 0 || rootBottom <= rootTop) return 0

  const topDistance = pointerY - rootTop
  if (topDistance < edgeSizePx) {
    return -Math.ceil(maxStepPx * clampScrollRatio((edgeSizePx - topDistance) / edgeSizePx))
  }

  const bottomDistance = rootBottom - pointerY
  if (bottomDistance < edgeSizePx) {
    return Math.ceil(maxStepPx * clampScrollRatio((edgeSizePx - bottomDistance) / edgeSizePx))
  }

  return 0
}

export function scrollCanvasReorderRootAtPointer(root: HTMLElement, pointerY: number): number {
  const rect = root.getBoundingClientRect()
  const delta = getCanvasReorderAutoScrollDelta({
    pointerY,
    rootBottom: rect.bottom,
    rootTop: rect.top,
  })

  if (delta !== 0) {
    root.scrollTop += delta
  }

  return delta
}
