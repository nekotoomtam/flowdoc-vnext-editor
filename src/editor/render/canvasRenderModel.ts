import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import { getPaperDocumentStackGeometry, type PaperDocumentStackGeometry } from "../paper/paperGeometry"
import type { PaperModel } from "../paper/paperModel"
import type { RenderPageSummary } from "./renderTypes"

export interface CanvasRenderModel {
  documentTitle: string
  pageCount: number
  pages: RenderPageSummary[]
  paper: PaperModel
  paperSizeLabel: string
  stackGeometry: PaperDocumentStackGeometry
  viewportMeasurementKey: string
}

export interface CreateCanvasRenderModelInput {
  document: CoreEditorDocumentSummary
  pages: RenderPageSummary[]
  paper: PaperModel
}

export function createCanvasRenderModel({
  document,
  pages,
  paper,
}: CreateCanvasRenderModelInput): CanvasRenderModel {
  const pageCount = pages.length
  const stackGeometry = getPaperDocumentStackGeometry(paper, pageCount)

  return {
    documentTitle: document.title,
    pageCount,
    pages,
    paper,
    paperSizeLabel: `${paper.widthPx} x ${paper.heightPx}px`,
    stackGeometry,
    viewportMeasurementKey: `${paper.preset}:${paper.zoom}:${stackGeometry.stackHeightPx}:${pageCount}`,
  }
}
