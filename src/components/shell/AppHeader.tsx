import type { CoreDiagnosticsSummary, CoreEditorDocumentSummary } from "../../core/coreTypes"

export interface AppHeaderProps {
  diagnostics: CoreDiagnosticsSummary
  document: CoreEditorDocumentSummary
}

export function AppHeader({ diagnostics, document }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-title">
        <span className="app-kicker">FlowDoc vNext</span>
        <strong>{document.title}</strong>
        <span>
          Package v{document.packageVersion} / Document v{document.documentVersion}
        </span>
      </div>
      <div className="app-header-status" aria-label="Document readiness">
        <span data-status={diagnostics.generationStatus}>Generation: {diagnostics.generationStatus}</span>
        <span data-status={diagnostics.exactLayoutStatus}>Layout: {diagnostics.exactLayoutStatus}</span>
        <span data-status={diagnostics.artifactStatus}>Artifact: {diagnostics.artifactStatus}</span>
      </div>
    </header>
  )
}
