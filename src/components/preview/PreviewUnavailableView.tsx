import { EyeOff, Pencil } from "lucide-react"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"

export interface PreviewUnavailableViewProps {
  document: CoreEditorDocumentSummary
  onReturnToDesign?: () => void
}

export function PreviewUnavailableView({ document, onReturnToDesign }: PreviewUnavailableViewProps) {
  const migrationRequired = document.packageVersion === 2 && document.documentVersion === 3

  return (
    <main className="preview-unavailable" aria-label="Document Preview">
      <div className="preview-unavailable-content">
        <EyeOff aria-hidden="true" className="preview-unavailable-icon" size={32} strokeWidth={1.6} />
        <span className="preview-kicker">Draft preview</span>
        <h1>Preview unavailable</h1>
        <p>
          {migrationRequired
            ? "This document must be migrated before Preview can prepare test input."
            : "Preview setup is not available for this document yet."}
        </p>
        <dl className="preview-document-facts">
          <div>
            <dt>Document</dt>
            <dd>{document.title}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>Package v{document.packageVersion} / Document v{document.documentVersion}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{migrationRequired ? "Migration required" : "Preview unavailable"}</dd>
          </div>
        </dl>
        <button
          aria-label="Return to Design"
          className="tool-button"
          onClick={onReturnToDesign}
          title="Return to Design"
          type="button"
        >
          <Pencil aria-hidden="true" size={16} />
          <span>Return to Design</span>
        </button>
      </div>
    </main>
  )
}
