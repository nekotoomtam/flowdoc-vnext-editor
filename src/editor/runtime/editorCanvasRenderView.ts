import { projectRenderDocument } from "../render/renderProjector"
import type { RenderDocumentProjection } from "../render/renderTypes"
import type { EditorView } from "./editorView"

export interface EditorCanvasRenderView {
  pages: RenderDocumentProjection["pages"]
  revision: number
}

export function createEditorCanvasRenderView(view: EditorView): EditorCanvasRenderView {
  const projection = projectRenderDocument(view)

  return {
    pages: projection.pages,
    revision: projection.revision,
  }
}
