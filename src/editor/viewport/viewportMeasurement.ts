import type { ViewportState } from "./viewportState"

export interface ViewportMeasurement {
  contentHeight: number
  contentWidth: number
  scrollLeft: number
  scrollTop: number
  viewportHeight: number
  viewportWidth: number
}

export interface ViewportPageBox {
  bottom: number
  id: string
  top: number
}

export interface ViewportScrollRootFacts extends ViewportMeasurement {
  visiblePageIds: string[]
}

export interface CreateViewportScrollRootFactsInput extends ViewportMeasurement {
  pageBoxes?: ViewportPageBox[]
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

function normalizePositiveNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function normalizeScrollNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

export function getVisiblePageIdsFromViewportBoxes(
  pageBoxes: ViewportPageBox[],
  viewportHeight: number,
): string[] {
  const normalizedViewportHeight = normalizePositiveNumber(viewportHeight)

  return pageBoxes
    .filter((box) => box.id.trim().length > 0)
    .filter((box) => box.bottom > 0 && box.top < normalizedViewportHeight)
    .map((box) => box.id)
}

export function createViewportScrollRootFacts(
  input: CreateViewportScrollRootFactsInput,
): ViewportScrollRootFacts {
  const viewportHeight = normalizePositiveNumber(input.viewportHeight)

  return {
    contentHeight: normalizePositiveNumber(input.contentHeight),
    contentWidth: normalizePositiveNumber(input.contentWidth),
    scrollLeft: normalizeScrollNumber(input.scrollLeft),
    scrollTop: normalizeScrollNumber(input.scrollTop),
    viewportHeight,
    viewportWidth: normalizePositiveNumber(input.viewportWidth),
    visiblePageIds: getVisiblePageIdsFromViewportBoxes(input.pageBoxes ?? [], viewportHeight),
  }
}
