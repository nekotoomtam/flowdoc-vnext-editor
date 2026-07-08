import type { RenderPageSummary } from "./renderTypes"

export interface RenderProjectionLayoutQaSummary {
  fitPageCount: number
  maxEstimatedFillPercent: number
  multiNodeOverflowPageCount: number
  overflowPageCount: number
  pageCount: number
  singleNodeOverflowPageCount: number
}

function getEstimatedFillRatio(page: RenderPageSummary): number {
  if (page.flowCapacityPx <= 0) return 0
  return page.estimatedContentHeightPx / page.flowCapacityPx
}

export function createRenderProjectionLayoutQaSummary(
  pages: readonly RenderPageSummary[],
): RenderProjectionLayoutQaSummary {
  let fitPageCount = 0
  let singleNodeOverflowPageCount = 0
  let multiNodeOverflowPageCount = 0
  let maxEstimatedFillRatio = 0

  for (const page of pages) {
    if (page.overflowStatus === "fits") fitPageCount += 1
    if (page.overflowStatus === "single-node-overflow") singleNodeOverflowPageCount += 1
    if (page.overflowStatus === "multi-node-overflow") multiNodeOverflowPageCount += 1
    maxEstimatedFillRatio = Math.max(maxEstimatedFillRatio, getEstimatedFillRatio(page))
  }

  return {
    fitPageCount,
    maxEstimatedFillPercent: Math.round(maxEstimatedFillRatio * 100),
    multiNodeOverflowPageCount,
    overflowPageCount: singleNodeOverflowPageCount + multiNodeOverflowPageCount,
    pageCount: pages.length,
    singleNodeOverflowPageCount,
  }
}
