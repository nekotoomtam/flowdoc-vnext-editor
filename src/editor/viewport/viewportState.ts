export interface ViewportState {
  scrollTop: number
  viewportHeight: number
}

export function createViewportState(): ViewportState {
  return {
    scrollTop: 0,
    viewportHeight: 0,
  }
}
