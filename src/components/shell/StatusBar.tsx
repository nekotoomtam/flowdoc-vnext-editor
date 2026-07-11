import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { FrontendCoreWorkingSet } from "../../editor/coreBinding/workingSetTypes"
import { getHistoryStackSummary } from "../../editor/history/historySelectors"
import type { HistoryStackState } from "../../editor/history/historyTypes"
import { getJobCounts } from "../../editor/jobs/jobSelectors"
import type { EditorJobQueueState } from "../../editor/jobs/jobTypes"
import type { PaperModel } from "../../editor/paper/paperModel"
import type { RenderProjectionLayoutQaSummary } from "../../editor/render/renderProjectionLayoutQa"
import type { EditorView } from "../../editor/runtime/editorView"
import type { SelectionState } from "../../editor/selection/selectionState"
import type { EditorVersionCapabilityStatus } from "../../editor/backend/backendVersionCapability"

export interface StatusBarProps {
  core: FrontendCoreWorkingSet
  document: CoreEditorDocumentSummary
  history: HistoryStackState
  jobs: EditorJobQueueState
  layoutQaSummary: RenderProjectionLayoutQaSummary | null
  paper: PaperModel
  previewPageCount: number
  selection: SelectionState
  view: EditorView
  versionCapabilityStatus: EditorVersionCapabilityStatus
}

export function StatusBar({
  core,
  document,
  history,
  jobs,
  layoutQaSummary,
  paper,
  previewPageCount,
  selection,
  view,
  versionCapabilityStatus,
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
      <span>Versions: {versionCapabilityStatus}</span>
      <span>Mode: {document.runtimeMode ?? "active"}</span>
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
      {layoutQaSummary ? (
        <>
          <span>
            Layout QA: {layoutQaSummary.fitPageCount}/{layoutQaSummary.pageCount} fit
          </span>
          <span>
            Overflow: {layoutQaSummary.singleNodeOverflowPageCount}/{layoutQaSummary.multiNodeOverflowPageCount}
          </span>
          <span>Max fill: {layoutQaSummary.maxEstimatedFillPercent}%</span>
        </>
      ) : null}
    </footer>
  )
}
