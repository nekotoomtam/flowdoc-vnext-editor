import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { EditorView } from "../../editor/runtime/editorView"

export interface StatusBarProps {
  document: CoreEditorDocumentSummary
  paper: PaperModel
  previewPageCount: number
  selectedNodeId: string
  view: EditorView
}

export function StatusBar({
  document,
  paper,
  previewPageCount,
  selectedNodeId,
  view,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span>Document: {document.id}</span>
      <span>Selected: {selectedNodeId}</span>
      <span>
        Paper: {paper.label} / {Math.round(paper.zoom * 100)}%
      </span>
      <span>Pages: {previewPageCount}</span>
      <span>Nodes: {view.nodeOrder.length}</span>
      <span>Text blocks: {view.textBlockIds.length}</span>
      <span>Tables: {view.tableIds.length}</span>
    </footer>
  )
}
