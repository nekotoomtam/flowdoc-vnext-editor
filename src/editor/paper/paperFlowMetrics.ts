import { getPaperContentBounds } from "./paperGeometry"
import { createDefaultPaperModel, type PaperModel } from "./paperModel"

export const PAPER_PAGE_HEADER_HEIGHT_ESTIMATE_PX = 24
export const PAPER_PAGE_GRID_GAP_PX = 16
export const PAPER_CONTENT_FLOW_VERTICAL_PADDING_PX = 32
export const PREVIEW_BLOCK_GAP_PX = 12
export const MIN_PREVIEW_FLOW_CAPACITY_PX = 160

export interface PaperPreviewFlowMetrics {
  blockGapPx: number
  flowCapacityPx: number
  flowPaddingBlockPx: number
  headerHeightEstimatePx: number
  minFlowCapacityPx: number
  pageGridGapPx: number
}

export interface PaperPreviewFlowMetricsOptions {
  flowCapacityPx?: number
  paper?: PaperModel
}

export function getPaperPreviewFlowMetrics(
  options: PaperPreviewFlowMetricsOptions = {},
): PaperPreviewFlowMetrics {
  const flowCapacityPx = options.flowCapacityPx !== undefined
    ? Math.max(MIN_PREVIEW_FLOW_CAPACITY_PX, options.flowCapacityPx)
    : Math.max(
        MIN_PREVIEW_FLOW_CAPACITY_PX,
        getPaperContentBounds(options.paper ?? createDefaultPaperModel()).height
          - PAPER_PAGE_HEADER_HEIGHT_ESTIMATE_PX
          - PAPER_PAGE_GRID_GAP_PX
          - PAPER_CONTENT_FLOW_VERTICAL_PADDING_PX,
      )

  return {
    blockGapPx: PREVIEW_BLOCK_GAP_PX,
    flowCapacityPx,
    flowPaddingBlockPx: PAPER_CONTENT_FLOW_VERTICAL_PADDING_PX / 2,
    headerHeightEstimatePx: PAPER_PAGE_HEADER_HEIGHT_ESTIMATE_PX,
    minFlowCapacityPx: MIN_PREVIEW_FLOW_CAPACITY_PX,
    pageGridGapPx: PAPER_PAGE_GRID_GAP_PX,
  }
}

export function getPaperPreviewFlowCapacityPx(
  options: PaperPreviewFlowMetricsOptions = {},
): number {
  return getPaperPreviewFlowMetrics(options).flowCapacityPx
}
