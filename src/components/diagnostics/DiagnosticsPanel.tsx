import type { CoreDiagnosticsSummary } from "../../core/coreTypes"
import type { EditorView } from "../../editor/runtime/editorView"

export interface DiagnosticsPanelProps {
  diagnostics: CoreDiagnosticsSummary
  selectionReason: string
  view: EditorView
}

export function DiagnosticsPanel({ diagnostics, selectionReason, view }: DiagnosticsPanelProps) {
  const diagnosticRows = [
    {
      label: "Generation",
      status: diagnostics.generationStatus,
    },
    {
      label: "Exact layout",
      status: diagnostics.exactLayoutStatus,
    },
    {
      label: "Artifact",
      status: diagnostics.artifactStatus,
    },
    {
      label: "Key data",
      status: diagnostics.keyDataStatus,
    },
  ]

  return (
    <section className="diagnostics-panel" aria-label="Diagnostics">
      <div className="panel-heading">Diagnostics</div>
      <div className="diagnostic-stack">
        {diagnosticRows.map((row) => (
          <div className="diagnostic-row" data-status={row.status} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.status}</strong>
          </div>
        ))}
      </div>
      <dl className="facts-list">
        <div>
          <dt>Graph issues</dt>
          <dd>{diagnostics.graphIssueCount}</dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>{selectionReason}</dd>
        </div>
        <div>
          <dt>Visible nodes</dt>
          <dd>{view.visibleNodeIds.length}</dd>
        </div>
        <div>
          <dt>Tables</dt>
          <dd>{view.tableIds.length}</dd>
        </div>
      </dl>
    </section>
  )
}
