import { projectRenderDocument } from "../render/renderProjector"
import type { RenderDocumentProjection } from "../render/renderTypes"
import type { PaperModel } from "../paper/paperModel"
import type { EditorView } from "./editorView"

export interface EditorCanvasRenderView {
  pages: RenderDocumentProjection["pages"]
  revision: number
}

export function createEditorCanvasRenderView(
  view: EditorView,
  paper?: PaperModel,
): EditorCanvasRenderView {
  const projection = projectRenderDocument(view, {
    paper,
  })

  return {
    pages: projection.pages,
    revision: projection.revision,
  }
}
