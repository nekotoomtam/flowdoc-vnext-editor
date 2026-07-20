import { useNavigate } from "react-router-dom"
import { useLiveDraftFormPreviewV1 } from "../../app/useLiveDraftFormPreview"
import { usePreviewTestInput } from "../../app/usePreviewTestInput"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../../fixtures/realdocE54TestInputProjectionFixture"
import { AppHeader } from "../shell/AppHeader"
import { PreviewTestInputView } from "./PreviewTestInputView"

const qaDocument = {
  id: "live-draft-xr3-form-qa",
  title: "Live Draft Form QA",
  packageVersion: 3,
  documentVersion: 4,
  runtimeMode: "active" as const,
}

const qaDiagnostics = {
  artifactStatus: "not-run",
  exactLayoutStatus: "not-run",
  generationStatus: "not-run",
  graphIssueCount: 0,
  keyDataStatus: "not-run",
}

export function LiveDraftFormQaPage() {
  const navigate = useNavigate()
  const interaction = usePreviewTestInput(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
  const liveDraft = useLiveDraftFormPreviewV1({
    enabled: true,
    documentId: qaDocument.id,
    structureRevision: 1,
    selectedFieldKey: "documentTitle",
    form: interaction.form,
  })
  const layout = liveDraft.lastValid?.result.coreLayout
  const evidenceState = {
    phase: liveDraft.phase,
    pendingRevision: liveDraft.pendingRevision,
    appliedRevision: liveDraft.appliedRevision,
    metrics: liveDraft.metrics,
    endToEndDurationMs: liveDraft.lastValid?.endToEndDurationMs ?? null,
    workerDurationMs: liveDraft.lastValid?.result.durationMs ?? null,
    pageCount: layout?.pagination.summary.pageCount ?? null,
    lineCount: layout?.acceptanceSummary.lineCount ?? null,
    paginationFingerprint: layout?.pagination.fingerprint ?? null,
  }

  return (
    <div className="editor-shell">
      <AppHeader
        activeView="preview"
        diagnostics={qaDiagnostics}
        document={qaDocument}
        onBackToLibrary={() => navigate("/documents")}
        onSelectView={(view) => {
          if (view === "design") navigate("/documents")
        }}
      />
      <output
        data-phase={liveDraft.phase}
        hidden
        id="flowdoc-live-draft-xr3-evidence-state"
      >
        {JSON.stringify(evidenceState)}
      </output>
      <div className="workspace-view-stack">
        <div className="preview-workspace-panel" id="workspace-panel-preview" role="tabpanel">
          <PreviewTestInputView
            document={qaDocument}
            interaction={interaction}
            liveDraft={liveDraft}
            projection={REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE}
          />
        </div>
      </div>
    </div>
  )
}
