import type { CoreEditorSeed } from "../../core/coreTypes"
import { createEditorView, type EditorView } from "../runtime/editorView"

export interface EditorReadModel extends EditorView {
  revision: number
}

export function createEditorReadModel(seed: CoreEditorSeed, revision = seed.document.documentVersion): EditorReadModel {
  return {
    ...createEditorView(seed),
    revision,
  }
}
