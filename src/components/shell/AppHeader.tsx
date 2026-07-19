import { ArrowLeft, Eye, Pencil } from "lucide-react"
import type { CoreDiagnosticsSummary, CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { DocumentWorkspaceView } from "../../app/documentWorkspaceRoute"

export interface AppHeaderProps {
  activeView: DocumentWorkspaceView
  diagnostics: CoreDiagnosticsSummary
  document: CoreEditorDocumentSummary
  onBackToLibrary?: () => void
  onSelectView?: (view: DocumentWorkspaceView) => void
}

export function AppHeader({
  activeView,
  diagnostics,
  document,
  onBackToLibrary,
  onSelectView,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-leading">
        {onBackToLibrary ? (
          <button
            aria-label="Back to documents"
            className="icon-button app-back-button"
            onClick={onBackToLibrary}
            title="Back to documents"
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} />
          </button>
        ) : null}
        <div className="app-title">
          <span className="app-kicker">FlowDoc vNext</span>
          <strong>{document.title}</strong>
          <span>
            Package v{document.packageVersion} / Document v{document.documentVersion}
          </span>
        </div>
      </div>
      <div aria-label="Document workspace view" className="workspace-tabs" role="tablist">
        <button
          aria-controls="workspace-panel-design"
          aria-selected={activeView === "design"}
          className="workspace-tab"
          id="workspace-tab-design"
          onClick={() => {
            if (activeView !== "design") onSelectView?.("design")
          }}
          role="tab"
          type="button"
        >
          <Pencil aria-hidden="true" size={15} />
          <span>Design</span>
        </button>
        <button
          aria-controls="workspace-panel-preview"
          aria-selected={activeView === "preview"}
          className="workspace-tab"
          id="workspace-tab-preview"
          onClick={() => {
            if (activeView !== "preview") onSelectView?.("preview")
          }}
          role="tab"
          type="button"
        >
          <Eye aria-hidden="true" size={16} />
          <span>Preview</span>
        </button>
      </div>
      <div className="app-header-status" aria-label="Document readiness">
        <span data-status={diagnostics.generationStatus}>Generation: {diagnostics.generationStatus}</span>
        <span data-status={diagnostics.exactLayoutStatus}>Layout: {diagnostics.exactLayoutStatus}</span>
        <span data-status={diagnostics.artifactStatus}>Artifact: {diagnostics.artifactStatus}</span>
      </div>
    </header>
  )
}
