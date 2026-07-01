import type { ViewportState } from "./viewportTypes"
import { clampViewportZoom, VIEWPORT_ZOOM_DEFAULT } from "./zoomPolicy"

export type { ViewportState } from "./viewportTypes"

export function createViewportState(zoom = VIEWPORT_ZOOM_DEFAULT): ViewportState {
  return {
    contentHeight: 0,
    contentWidth: 0,
    pendingAnchor: null,
    renderWindowPageIds: [],
    revision: 0,
    scrollLeft: 0,
    scrollTop: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    visiblePageIds: [],
    zoom: clampViewportZoom(zoom),
  }
}
