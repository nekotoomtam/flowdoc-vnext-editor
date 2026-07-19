import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { DocumentLibraryPage } from "../components/library/DocumentLibraryPage"
import { PreviewTestInputQaPage } from "../components/preview/PreviewTestInputQaPage"
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
          </>
        ) : null}
        <Route element={<Navigate replace to="/documents" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
