export interface RenderWindowState {
  firstPageIndex: number
  lastPageIndex: number
  overscanPages: number
}

export function createInitialRenderWindow(): RenderWindowState {
  return {
    firstPageIndex: 0,
    lastPageIndex: 0,
    overscanPages: 0,
  }
}
