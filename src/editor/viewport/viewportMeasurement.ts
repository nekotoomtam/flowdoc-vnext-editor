import type { ViewportState } from "./viewportState"

export interface ViewportMeasurement {
  scrollTop: number
  viewportHeight: number
}

export function createViewportMeasurement(state: ViewportState): ViewportMeasurement {
  return {
    scrollTop: state.scrollTop,
    viewportHeight: state.viewportHeight,
  }
}
