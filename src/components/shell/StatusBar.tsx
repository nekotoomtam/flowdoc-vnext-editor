import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { FrontendCoreWorkingSet } from "../../editor/coreBinding/workingSetTypes"
import { getHistoryStackSummary } from "../../editor/history/historySelectors"
import type { HistoryStackState } from "../../editor/history/historyTypes"
import { getJobCounts } from "../../editor/jobs/jobSelectors"
import type { EditorJobQueueState } from "../../editor/jobs/jobTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { EditorView } from "../../editor/runtime/editorView"
import type { SelectionState } from "../../editor/selection/selectionState"

export interface StatusBarProps {
  core: FrontendCoreWorkingSet
  document: CoreEditorDocumentSummary
  history: HistoryStackState
  jobs: EditorJobQueueState
  paper: PaperModel
  previewPageCount: number
  selection: SelectionState
  view: EditorView
}

export function StatusBar({
  core,
  document,
  history,
  jobs,
  paper,
  previewPageCount,
  selection,
  view,
}: StatusBarProps) {
  const jobCounts = getJobCounts(jobs)
  const historySummary = getHistoryStackSummary(history)
  const renderKind = core.renderProjection?.kind ?? "none"

  return (
    <footer className="status-bar">
      <span>Document: {document.id}</span>
      <span>
        Core: {core.envelope.sourceKind} r{core.envelope.documentRevision}
      </span>
      <span>Render: {renderKind}</span>
      <span>Selected: {selection.selectedNodeId ?? "none"}</span>
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
      <span>Local history: {historySummary.localRecordCount}</span>
      <span>Doc changes: {historySummary.documentChangeRecordCount}</span>
      <span>Undoable: {historySummary.undoableRecordCount}</span>
    </footer>
  )
}
