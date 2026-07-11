import type { EditorRuntimeState } from "../runtime/editorState"
import type { BackendMigrationRequest } from "./backendTransport"

export type BackendMigrationRequestBlockReason =
  | "document-not-active"
  | "envelope-not-fresh"
  | "not-backend-document"
  | "unsupported-source-version"

export type BackendMigrationRequestBuildResult =
  | { request: BackendMigrationRequest; status: "ready" }
  | { reason: BackendMigrationRequestBlockReason; status: "blocked" }

export function canRetryBackendMigrationRequest(
  state: EditorRuntimeState,
  request: BackendMigrationRequest | null,
): request is BackendMigrationRequest {
  return request != null
    && request.documentId === state.core.envelope.documentId
    && request.baseRevision === state.core.envelope.documentRevision
    && state.seed.document.runtimeMode !== "read-only"
}

export function createBackendMigrationRequest(
  state: EditorRuntimeState,
  options: { reason?: string; requestId: string },
): BackendMigrationRequestBuildResult {
  if (state.seed.document.runtimeMode === "read-only") {
    return { reason: "document-not-active", status: "blocked" }
  }
  if (state.core.envelope.status !== "fresh") {
    return { reason: "envelope-not-fresh", status: "blocked" }
  }
  if (state.core.envelope.sourceKind !== "api") {
    return { reason: "not-backend-document", status: "blocked" }
  }
  if (state.core.envelope.packageVersion !== 2 || state.core.envelope.documentVersion !== 3) {
    return { reason: "unsupported-source-version", status: "blocked" }
  }

  return {
    request: {
      baseRevision: state.core.envelope.documentRevision,
      documentId: state.core.envelope.documentId,
      requestId: options.requestId,
      source: "editor",
      ...(options.reason ? { reason: options.reason } : {}),
    },
    status: "ready",
  }
}
