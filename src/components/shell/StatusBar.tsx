import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { HistoryStackState } from "../../editor/history/historyTypes"
import { getJobCounts } from "../../editor/jobs/jobSelectors"
import type { EditorJobQueueState } from "../../editor/jobs/jobTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { EditorView } from "../../editor/runtime/editorView"

export interface StatusBarProps {
  document: CoreEditorDocumentSummary
  history: HistoryStackState
  jobs: EditorJobQueueState
  paper: PaperModel
  previewPageCount: number
  selectedNodeId: string
  view: EditorView
}

export function StatusBar({
  document,
  history,
  jobs,
  paper,
  previewPageCount,
  selectedNodeId,
  view,
}: StatusBarProps) {
  const jobCounts = getJobCounts(jobs)

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
      <span>
        Jobs: {jobCounts.active}/{jobCounts.total}
      </span>
      <span>History: {history.records.length}</span>
    </footer>
  )
}
