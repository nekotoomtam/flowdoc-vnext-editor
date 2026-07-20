import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppHeader } from "../shell/AppHeader"
import { PreviewTestInputView } from "./PreviewTestInputView"
import { usePreviewTestInput } from "../../app/usePreviewTestInput"
import { usePublishedPreviewContext } from "../../app/usePublishedPreviewContext"
import { useExactPreviewGeneration } from "../../app/usePublishedPreviewGeneration"
import { createPublishedPreviewClient } from "../../editor/preview/publishedPreviewTransport"
import { createDraftPreviewClient } from "../../editor/preview/draftPreviewTransport"
import { useDraftPreviewContext } from "../../app/useDraftPreviewContext"
import { createLocalPdfExportClient } from "../../editor/pdfExport/localPdfExportTransport"
import { PreviewContextStateView } from "./PreviewContextStateView"
import { readExactPreviewReconnectTargetV1 } from "../../editor/preview/exactPreviewReconnect"

const pin = { documentId: "realdoc-e5-6-published-preview", documentRevision: 0 }
const document = {
  id: pin.documentId,
  title: "69C UAT RC Preview",
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
  const draftClient = useMemo(() => createDraftPreviewClient(), [])
  const pdfClient = useMemo(() => createLocalPdfExportClient(), [])
  const [target, setTarget] = useState<"draft" | "published">(
    () => readExactPreviewReconnectTargetV1() ?? "draft",
  )
  const publishedContext = usePublishedPreviewContext({ client, pin })
  const draftContext = useDraftPreviewContext({ client: draftClient, pin })
  const context = target === "draft" ? draftContext : publishedContext
  const input = usePreviewTestInput(
    context.context?.projection ?? null,
    context.context?.mappingProfiles ?? [],
    context.context?.admission.assets,
  )
  const admitAdaptedJson = useCallback((admissionInput: {
    profile: Parameters<typeof client.admitAdaptedJson>[0]["profile"]
    payloadText: string
    idempotencyKey: string
  }) => {
    if (target === "draft") {
      if (draftContext.context == null) return Promise.reject(new Error("Draft Preview context is unavailable"))
      return draftClient.admitAdaptedJson({ ...admissionInput, context: draftContext.context })
    }
    if (publishedContext.context == null) return Promise.reject(new Error("Published Preview context is unavailable"))
    return client.admitAdaptedJson({ ...admissionInput, context: publishedContext.context })
  }, [client, draftClient, draftContext.context, publishedContext.context, target])
  const admitCanonicalForm = useCallback((admissionInput: {
    data: Parameters<typeof client.admitCanonicalForm>[0]["data"]
    collections: Parameters<typeof client.admitCanonicalForm>[0]["collections"]
    idempotencyKey: string
  }) => {
    if (target === "draft") {
      if (draftContext.context == null) return Promise.reject(new Error("Draft Preview context is unavailable"))
      return draftClient.admitCanonicalForm({ ...admissionInput, context: draftContext.context })
    }
    if (publishedContext.context == null) return Promise.reject(new Error("Published Preview context is unavailable"))
    return client.admitCanonicalForm({ ...admissionInput, context: publishedContext.context })
  }, [client, draftClient, draftContext.context, publishedContext.context, target])
  const preview = useExactPreviewGeneration({
    target,
    context: context.context,
    input,
    admitAdaptedJson,
    admitCanonicalForm,
    pdfClient,
  })

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
              previewTarget={target}
              previewTargetAvailability={{
                draft: draftContext.status === "ready",
                published: publishedContext.status === "ready",
              }}
              onSelectPreviewTarget={setTarget}
            />
          ) : (
            <PreviewContextStateView
              document={document}
              onRetry={(retryTarget) => {
                if (retryTarget === "draft") draftContext.retry()
                else publishedContext.retry()
              }}
              onSelectTarget={setTarget}
              statuses={{
                draft: draftContext.status,
                published: publishedContext.status,
              }}
              target={target}
            />
          )}
        </div>
      </div>
    </div>
  )
}
