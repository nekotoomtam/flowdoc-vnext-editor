import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { DocumentLibraryPage } from "../components/library/DocumentLibraryPage"
import { EditorApp } from "./EditorApp"

function DesignRoute() {
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()

  if (!documentId) return <Navigate replace to="/documents" />

  return (
    <EditorApp
      documentId={documentId}
      onBackToLibrary={() => navigate("/documents")}
    />
  )
}

export function FlowDocApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Navigate replace to="/documents" />} path="/" />
        <Route element={<DocumentLibraryPage />} path="/documents" />
        <Route element={<DesignRoute />} path="/documents/:documentId/design" />
        <Route element={<Navigate replace to="/documents" />} path="*" />
      </Routes>
    </BrowserRouter>
  )
}
