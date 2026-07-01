import type { ViewportState } from "./viewportState"

export interface ViewportMeasurement {
  contentHeight: number
  contentWidth: number
  scrollLeft: number
  scrollTop: number
  viewportHeight: number
  viewportWidth: number
}

export function createViewportMeasurement(state: ViewportState): ViewportMeasurement {
  return {
    contentHeight: state.contentHeight,
    contentWidth: state.contentWidth,
    scrollLeft: state.scrollLeft,
    scrollTop: state.scrollTop,
    viewportHeight: state.viewportHeight,
    viewportWidth: state.viewportWidth,
  }
}
