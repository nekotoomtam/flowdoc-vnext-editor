export const VIEWPORT_ZOOM_DEFAULT = 0.85
export const VIEWPORT_ZOOM_MAX = 1.25
export const VIEWPORT_ZOOM_MIN = 0.5
export const VIEWPORT_ZOOM_STEP = 0.1

export function clampViewportZoom(zoom: number): number {
  return Math.min(VIEWPORT_ZOOM_MAX, Math.max(VIEWPORT_ZOOM_MIN, Number(zoom.toFixed(2))))
}
