import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  canRetryBackendMigrationRequest,
  createBackendMigrationRequest,
} from "../editor/backend/backendMigrationRequests"
import type { BackendMigrationRequest, FlowDocBackendClient } from "../editor/backend/backendTransport"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import { applyRuntimeBackendMigrationResult } from "../editor/runtime/runtimeBackendMigration"
import {
  IDLE_DOCUMENT_MIGRATION_STATUS,
  type RuntimeDocumentMigrationStatus,
} from "../editor/runtime/runtimeMigrationStatus"

export interface UseBackendDocumentMigrationOptions {
  backendClient: Pick<FlowDocBackendClient, "migrateDocument" | "readDocument">
  editorState: EditorRuntimeState
  enabled: boolean
  setEditorState: Dispatch<SetStateAction<EditorRuntimeState>>
}

function createRequestId(state: EditorRuntimeState): string {
  return `document.migrate:${state.core.envelope.documentId}:${state.core.envelope.documentRevision}:${Date.now()}`
}

export function useBackendDocumentMigration({
  backendClient,
  editorState,
  enabled,
  setEditorState,
}: UseBackendDocumentMigrationOptions) {
  const editorStateRef = useRef(editorState)
  const retryRequestRef = useRef<BackendMigrationRequest | null>(null)
  const [migrationStatus, setMigrationStatus] = useState<RuntimeDocumentMigrationStatus>(
    IDLE_DOCUMENT_MIGRATION_STATUS,
  )

  useEffect(() => {
    editorStateRef.current = editorState
  }, [editorState])

  const migrateDocument = useCallback(() => {
    if (!enabled || migrationStatus.status === "pending") {
      setMigrationStatus({
        message: "Migration is not available for this document.",
        requestId: null,
        revision: editorStateRef.current.core.envelope.documentRevision,
        status: "failed",
      })
      return
    }

    const retryRequest = retryRequestRef.current
    const canRetryRequest = canRetryBackendMigrationRequest(editorStateRef.current, retryRequest)
    const built = canRetryRequest
      ? { request: retryRequest, status: "ready" as const }
      : createBackendMigrationRequest(editorStateRef.current, {
          reason: "editor-explicit-version-upgrade",
          requestId: createRequestId(editorStateRef.current),
        })
    if (built.status === "blocked") {
      setMigrationStatus({
        message: "Migration was blocked by the current document state.",
        requestId: null,
        revision: editorStateRef.current.core.envelope.documentRevision,
        status: "failed",
      })
      return
    }

    setMigrationStatus({
      message: canRetryRequest ? "Retrying document upgrade." : "Upgrading document.",
      requestId: built.request.requestId,
      revision: built.request.baseRevision,
      status: "pending",
    })
    retryRequestRef.current = built.request

    void backendClient.migrateDocument(built.request)
      .then(async (result) => {
        const readResult = result.status === "applied" && result.revision != null
          ? await backendClient.readDocument(result.documentId)
          : null
        const applied = applyRuntimeBackendMigrationResult(
          editorStateRef.current,
          built.request,
          result,
          readResult,
        )

        editorStateRef.current = applied.state
        setEditorState(applied.state)
        if (applied.status === "applied"
          || applied.status === "replayed"
          || applied.status === "stale"
          || applied.status === "blocked-stale"
          || applied.status === "rejected") {
          retryRequestRef.current = null
        }
        setMigrationStatus({
          message: applied.status === "applied"
            ? "Document upgraded with partial v4 operations."
            : applied.status === "replayed"
              ? "Migration replay verified with partial v4 operations."
              : applied.status === "stale" || applied.status === "blocked-stale"
                ? "Migration blocked by a newer document revision."
                : applied.status === "rejected"
                  ? result.issues[0]?.message ?? "Migration rejected."
                  : "Migration result could not be verified.",
          requestId: built.request.requestId,
          revision: result.revision,
          status: applied.status === "applied" || applied.status === "replayed"
            ? applied.status
            : applied.status === "stale" || applied.status === "blocked-stale"
              ? "stale"
              : applied.status === "rejected"
                ? "rejected"
                : "failed",
        })
      })
      .catch(() => {
        setMigrationStatus({
          message: "Backend unavailable during migration.",
          requestId: built.request.requestId,
          revision: built.request.baseRevision,
          status: "failed",
        })
      })
  }, [backendClient, enabled, migrationStatus.status, setEditorState])

  return { migrateDocument, migrationStatus }
}
