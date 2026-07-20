import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AppHeader } from "../shell/AppHeader"
import { PreviewTestInputView } from "./PreviewTestInputView"
import { usePreviewTestInput } from "../../app/usePreviewTestInput"
import { usePublishedPreviewContext } from "../../app/usePublishedPreviewContext"
import { usePublishedPreviewGeneration } from "../../app/usePublishedPreviewGeneration"
import { createPublishedPreviewClient } from "../../editor/preview/publishedPreviewTransport"
import { createLocalPdfExportClient } from "../../editor/pdfExport/localPdfExportTransport"

const pin = { documentId: "realdoc-e5-6-published-preview", documentRevision: 0 }
const document = {
  id: pin.documentId,
  title: "69C UAT RC Published Preview",
  packageVersion: 3,
  documentVersion: 4,
  runtimeMode: "active" as const,
}
const diagnostics = {
  artifactStatus: "not-run",
  exactLayoutStatus: "not-run",
  generationStatus: "not-run",
  graphIssueCount: 0,
  keyDataStatus: "not-run",
}

export function PublishedPreviewQaPage() {
  const navigate = useNavigate()
  const client = useMemo(() => createPublishedPreviewClient(), [])
  const pdfClient = useMemo(() => createLocalPdfExportClient(), [])
  const context = usePublishedPreviewContext({ client, pin })
  const input = usePreviewTestInput(
    context.context?.projection ?? null,
    context.context?.mappingProfiles ?? [],
  )
  const preview = usePublishedPreviewGeneration({ context: context.context, input, client, pdfClient })

  return (
    <div className="editor-shell">
      <AppHeader
        activeView="preview"
        diagnostics={diagnostics}
        document={document}
        onBackToLibrary={() => navigate("/documents")}
        onSelectView={(view) => {
          if (view === "design") navigate("/documents")
        }}
      />
      <div className="workspace-view-stack">
        <div className="preview-workspace-panel" id="workspace-panel-preview" role="tabpanel">
          {context.context && input.form.state && input.json.state ? (
            <PreviewTestInputView
              document={document}
              interaction={input}
              projection={context.context.projection}
              publishedPreview={preview}
            />
          ) : (
            <main className="preview-unavailable" aria-live="polite">
              <strong>{context.status === "checking" ? "Loading Published Preview" : "Published Preview unavailable"}</strong>
              {context.status === "unavailable" ? (
                <button className="tool-button" onClick={context.retry} type="button">Retry</button>
              ) : null}
            </main>
          )}
        </div>
      </div>
    </div>
  )
}
