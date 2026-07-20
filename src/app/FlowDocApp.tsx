import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { DocumentLibraryPage } from "../components/library/DocumentLibraryPage"
import { PreviewTestInputQaPage } from "../components/preview/PreviewTestInputQaPage"
import { PublishedPreviewQaPage } from "../components/preview/PublishedPreviewQaPage"
import { LiveDraftFormQaPage } from "../components/preview/LiveDraftFormQaPage"
import { EditorApp } from "./EditorApp"
import {
  createDocumentWorkspacePath,
  resolveDocumentWorkspaceView,
  type DocumentWorkspaceView,
} from "./documentWorkspaceRoute"

function DocumentWorkspaceRoute() {
  const navigate = useNavigate()
  const { documentId, view } = useParams<{ documentId: string; view: string }>()
  const activeView = resolveDocumentWorkspaceView(view)

  if (!documentId) return <Navigate replace to="/documents" />
  if (!activeView) return <Navigate replace to={createDocumentWorkspacePath(documentId, "design")} />

  return (
    <EditorApp
      activeWorkspaceView={activeView}
      documentId={documentId}
      key={documentId}
      onBackToLibrary={() => navigate("/documents")}
      onSelectWorkspaceView={(nextView: DocumentWorkspaceView) => (
        navigate(createDocumentWorkspacePath(documentId, nextView))
      )}
    />
  )
}

function DocumentWorkspaceDefaultRoute() {
  const { documentId } = useParams<{ documentId: string }>()
  return documentId
    ? <Navigate replace to={createDocumentWorkspacePath(documentId, "design")} />
    : <Navigate replace to="/documents" />
}

export function FlowDocApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate replace to="/documents" />} path="/" />
        <Route element={<DocumentLibraryPage />} path="/documents" />
        <Route element={<DocumentWorkspaceDefaultRoute />} path="/documents/:documentId" />
        <Route element={<DocumentWorkspaceRoute />} path="/documents/:documentId/:view" />
        {import.meta.env.DEV ? (
          <>
            <Route element={<PreviewTestInputQaPage />} path="/__qa/realdoc-e5-4-form" />
            <Route element={<PreviewTestInputQaPage />} path="/__qa/realdoc-e5-5-input" />
            <Route element={<PublishedPreviewQaPage />} path="/__qa/realdoc-e5-6-published-preview" />
            <Route element={<PublishedPreviewQaPage />} path="/__qa/realdoc-e5-7-draft-preview" />
            <Route element={<PublishedPreviewQaPage />} path="/__qa/realdoc-e5-8-preview-lifecycle" />
            <Route element={<PublishedPreviewQaPage />} path="/__qa/realdoc-e5-9-form-api-parity" />
            <Route element={<LiveDraftFormQaPage />} path="/__qa/live-draft-xr3-form" />
          </>
        ) : null}
        <Route element={<Navigate replace to="/documents" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
