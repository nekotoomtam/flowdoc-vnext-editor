import { useNavigate } from "react-router-dom"
import { AppHeader } from "../shell/AppHeader"
import { PreviewTestInputView } from "./PreviewTestInputView"
import { usePreviewTestInputForm } from "../../app/usePreviewTestInputForm"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../../fixtures/realdocE54TestInputProjectionFixture"

const qaDocument = {
  id: "realdoc-e5-4-form-qa",
  title: "Test input workspace",
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

export function PreviewTestInputQaPage() {
  const navigate = useNavigate()
  const interaction = usePreviewTestInputForm(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)

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
      <div className="workspace-view-stack">
        <div
          aria-labelledby="workspace-tab-preview"
          className="preview-workspace-panel"
          id="workspace-panel-preview"
          role="tabpanel"
        >
          <PreviewTestInputView
            document={qaDocument}
            interaction={interaction}
            projection={REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE}
          />
        </div>
      </div>
    </div>
  )
}
