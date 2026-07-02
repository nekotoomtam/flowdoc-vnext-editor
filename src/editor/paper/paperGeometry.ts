import type { PaperModel } from "./paperModel"

export interface PaperBounds {
  height: number
  width: number
}

export interface PaperPageGeometry {
  contentBounds: PaperBounds
  marginPx: number
  pageBounds: PaperBounds
  scaledContentBounds: PaperBounds
  scaledMarginPx: number
  shellBounds: PaperBounds
}

export interface PaperDocumentStackGeometry {
  pageCount: number
  pageGapPx: number
  pageHeightPx: number
  pageWidthPx: number
  stackHeightPx: number
  stackWidthPx: number
}

export function getPaperBounds(model: PaperModel): PaperBounds {
  return {
    height: model.heightPx * model.zoom,
    width: model.widthPx * model.zoom,
  }
}

export function getPaperContentBounds(model: PaperModel): PaperBounds {
  return {
    height: Math.max(0, model.heightPx - model.marginPx * 2),
    width: Math.max(0, model.widthPx - model.marginPx * 2),
  }
}

export function getScaledPaperGap(model: PaperModel): number {
  return model.gapPx * model.zoom
}

export function getPaperPageGeometry(model: PaperModel): PaperPageGeometry {
  const contentBounds = getPaperContentBounds(model)
  const pageBounds = {
    height: model.heightPx,
    width: model.widthPx,
  }
  const shellBounds = getPaperBounds(model)

  return {
    contentBounds,
    marginPx: model.marginPx,
    pageBounds,
    scaledContentBounds: {
      height: contentBounds.height * model.zoom,
      width: contentBounds.width * model.zoom,
    },
    scaledMarginPx: model.marginPx * model.zoom,
    shellBounds,
  }
}

export function getPaperDocumentStackGeometry(
  model: PaperModel,
  pageCount: number,
): PaperDocumentStackGeometry {
  const safePageCount = Math.max(0, Math.floor(pageCount))
  const pageBounds = getPaperBounds(model)
  const pageGapPx = getScaledPaperGap(model)
  const stackHeightPx = safePageCount === 0
    ? 0
    : pageBounds.height * safePageCount + pageGapPx * (safePageCount - 1)

  return {
    pageCount: safePageCount,
    pageGapPx,
    pageHeightPx: pageBounds.height,
    pageWidthPx: pageBounds.width,
    stackHeightPx,
    stackWidthPx: safePageCount === 0 ? 0 : pageBounds.width,
  }
}
