import { Eye, FileText, Pencil, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  createFlowDocBackendClient,
  type BackendDocumentLibraryItem,
} from "../../editor/backend/backendTransport"
import { resolveFlowDocBackendBaseUrl } from "../../editor/backend/backendConfig"

const PAGE_SIZE = 24

function readinessLabel(item: BackendDocumentLibraryItem): string {
  if (item.authoring.status === "ready") return "Draft ready"
  if (item.authoring.status === "migration-required") return "Migration required"
  return "Draft unavailable"
}

function previewReason(item: BackendDocumentLibraryItem): string {
  return item.capabilities.preview.reason === "migration-required"
    ? "Preview requires document migration"
    : "Preview will be added in the next phase"
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function DocumentLibraryPage() {
  const navigate = useNavigate()
  const backendBaseUrl = useMemo(
    () => resolveFlowDocBackendBaseUrl(import.meta.env.VITE_FLOWDOC_BACKEND_URL as string | undefined),
    [],
  )
  const backendClient = useMemo(
    () => createFlowDocBackendClient({ baseUrl: backendBaseUrl }),
    [backendBaseUrl],
  )
  const [items, setItems] = useState<BackendDocumentLibraryItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<"error" | "loading" | "loading-more" | "ready">("loading")

  const readPage = useCallback(async (cursor?: string) => {
    setStatus(cursor ? "loading-more" : "loading")
    try {
      const result = await backendClient.readDocumentLibrary({ cursor, limit: PAGE_SIZE })
      if (result.status !== "ready") {
        setStatus("error")
        return
      }

      setItems((current) => cursor ? [...current, ...result.page.items] : result.page.items)
      setNextCursor(result.page.nextCursor)
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [backendClient])

  useEffect(() => {
    void readPage()
  }, [readPage])

  return (
    <div className="library-shell">
      <header className="library-header">
        <div className="library-brand">
          <strong>FlowDoc</strong>
          <span>Documents</span>
        </div>
        <span className="library-scope">Local workspace</span>
      </header>

      <main className="library-main">
        <div className="library-heading">
          <div>
            <h1>Documents</h1>
            <p>{items.length > 0 ? `${items.length} document${items.length === 1 ? "" : "s"}` : "Local document library"}</p>
          </div>
          <button
            aria-label="Refresh documents"
            className="icon-button library-refresh"
            disabled={status === "loading" || status === "loading-more"}
            onClick={() => void readPage()}
            title="Refresh documents"
            type="button"
          >
            <RefreshCw aria-hidden="true" size={17} />
          </button>
        </div>

        {status === "loading" ? (
          <div aria-live="polite" className="library-state">Loading documents...</div>
        ) : status === "error" ? (
          <div className="library-state library-state-error" role="alert">
            <strong>Documents are unavailable</strong>
            <span>Check the local Backend and try again.</span>
            <button className="tool-button" onClick={() => void readPage()} type="button">
              <RefreshCw aria-hidden="true" size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="library-state">
            <FileText aria-hidden="true" size={24} />
            <strong>No documents yet</strong>
          </div>
        ) : (
          <section aria-label="Documents" className="document-grid">
            {items.map((item) => (
              <article className="document-card" key={item.documentId}>
                <button
                  aria-label={`Open ${item.title} in Design`}
                  className="document-thumbnail"
                  onClick={() => navigate(`/documents/${encodeURIComponent(item.documentId)}/design`)}
                  type="button"
                >
                  <span className="document-paper" aria-hidden="true">
                    <FileText size={34} strokeWidth={1.5} />
                    <i />
                    <i />
                    <i />
                  </span>
                </button>
                <div className="document-card-body">
                  <div className="document-card-title-row">
                    <div>
                      <h2>{item.title}</h2>
                      <p>Updated {formatUpdatedAt(item.updatedAt)} · Revision {item.revision}</p>
                    </div>
                    <span className="document-readiness" data-status={item.authoring.status}>
                      {readinessLabel(item)}
                    </span>
                  </div>
                  <div className="document-card-actions">
                    <button
                      aria-label={`Edit ${item.title} in Design`}
                      className="tool-button"
                      onClick={() => navigate(`/documents/${encodeURIComponent(item.documentId)}/design`)}
                      title="Edit in Design"
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} />
                      <span>Design</span>
                    </button>
                    <button
                      aria-label={`Preview ${item.title}`}
                      className="icon-button"
                      disabled
                      title={previewReason(item)}
                      type="button"
                    >
                      <Eye aria-hidden="true" size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {status !== "error" && nextCursor ? (
          <div className="library-load-more">
            <button
              className="tool-button"
              disabled={status === "loading-more"}
              onClick={() => void readPage(nextCursor)}
              type="button"
            >
              {status === "loading-more" ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
