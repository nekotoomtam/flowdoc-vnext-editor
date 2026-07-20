import { FileText, LoaderCircle, RefreshCw } from "lucide-react"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"

export type PreviewContextStatus = "checking" | "ready" | "unavailable"

export interface PreviewTargetContextStatuses {
  draft: PreviewContextStatus
  published: PreviewContextStatus
}

export function PreviewContextStateView({
  document,
  onRetry,
  onSelectTarget,
  statuses,
  target,
}: {
  document: CoreEditorDocumentSummary
  onRetry: (target: "draft" | "published") => void
  onSelectTarget: (target: "draft" | "published") => void
  statuses: PreviewTargetContextStatuses
  target: "draft" | "published"
}) {
  const status = statuses[target]
  const targetLabel = target === "draft" ? "Draft Preview" : "Published Preview"
  return (
    <main className="preview-unavailable" aria-live="polite">
      <div className="preview-unavailable-content">
        <div aria-label="Preview target" className="segmented-control preview-context-targets" role="group">
          {(["draft", "published"] as const).map((option) => (
            <button
              aria-pressed={target === option}
              className="segmented-button"
              data-active={target === option}
              data-status={statuses[option]}
              key={option}
              onClick={() => onSelectTarget(option)}
              type="button"
            >
              {option === "draft" ? "Draft" : "Published"}
            </button>
          ))}
        </div>
        {status === "checking" ? (
          <LoaderCircle aria-hidden="true" className="preview-unavailable-icon is-spinning" size={30} />
        ) : (
          <FileText aria-hidden="true" className="preview-unavailable-icon" size={30} />
        )}
        <span className="preview-kicker">{targetLabel}</span>
        <h1>{status === "checking" ? "Loading Preview" : "Preview unavailable"}</h1>
        <p>{document.title}</p>
        {status === "unavailable" ? (
          <button className="tool-button" onClick={() => onRetry(target)} type="button">
            <RefreshCw aria-hidden="true" size={15} />
            <span>Retry</span>
          </button>
        ) : null}
      </div>
    </main>
  )
}
