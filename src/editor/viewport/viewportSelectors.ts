import type { ViewportAnchor, ViewportState } from "./viewportTypes"

export function getViewportAnchor(state: ViewportState): ViewportAnchor | null {
  return state.pendingAnchor
}

export function getViewportScrollPosition(state: ViewportState): {
  scrollLeft: number
  scrollTop: number
} {
  return {
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
  }
}

export function getViewportZoom(state: ViewportState): number {
  return state.zoom
}

export function getViewportZoomPercent(state: ViewportState): number {
  return Math.round(state.zoom * 100)
}

export function hasPendingViewportAnchor(state: ViewportState): boolean {
  return state.pendingAnchor !== null
}
