import type { CoreReadBindingFailure } from "../../core/coreTypes"
import {
  type BackendDocumentReadResult,
  type BackendMigrationIssue,
  type BackendMigrationRequest,
  type BackendMigrationResultEnvelope,
} from "../backend/backendTransport"
import { bindFrontendCoreWorkingSetFromTransportEnvelope } from "../coreBinding/workingSetFactory"
import { createSelectionState } from "../selection/selectionState"
import type { EditorRuntimeState } from "./editorState"
import { createEditorSeedFromWorkingSet } from "./runtimeCoreBinding"

export type RuntimeBackendMigrationApplyStatus =
  | "applied"
  | "replayed"
  | "blocked-invalid"
  | "blocked-stale"
  | "rejected"
  | "stale"

export interface RuntimeBackendMigrationApply {
  failures: CoreReadBindingFailure[]
  issues: BackendMigrationIssue[]
  reason: string | null
  state: EditorRuntimeState
  status: RuntimeBackendMigrationApplyStatus
}

function blocked(
  state: EditorRuntimeState,
  result: BackendMigrationResultEnvelope,
  status: RuntimeBackendMigrationApplyStatus,
  reason: string,
  failures: CoreReadBindingFailure[] = [],
): RuntimeBackendMigrationApply {
  return { failures, issues: result.issues, reason, state, status }
}

export function applyRuntimeBackendMigrationResult(
  state: EditorRuntimeState,
  request: BackendMigrationRequest,
  result: BackendMigrationResultEnvelope,
  readResult: BackendDocumentReadResult | null,
): RuntimeBackendMigrationApply {
  if (result.status !== "applied") {
    return blocked(state, result, result.status, result.issues[0]?.code ?? result.status)
  }
  if (request.requestId !== result.requestId) {
    return blocked(state, result, "blocked-invalid", "request-mismatch")
  }
  if (request.documentId !== result.documentId || state.core.envelope.documentId !== result.documentId) {
    return blocked(state, result, "blocked-stale", "document-mismatch")
  }
  if (request.baseRevision !== result.baseRevision
    || state.core.envelope.documentRevision !== result.baseRevision) {
    return blocked(state, result, "blocked-stale", "base-revision-mismatch")
  }
  if (result.revision == null || result.revision <= result.baseRevision) {
    return blocked(state, result, "blocked-invalid", "invalid-target-revision")
  }
  if (result.idempotency !== "new" && result.idempotency !== "replayed") {
    return blocked(state, result, "blocked-invalid", "invalid-idempotency")
  }
  if (result.target?.packageVersion !== 3 || result.target.documentVersion !== 4) {
    return blocked(state, result, "blocked-invalid", "invalid-target-version")
  }
  if (!readResult || readResult.status !== "found") {
    return blocked(state, result, "blocked-invalid", "target-read-unavailable")
  }
  if (readResult.response.documentId !== result.documentId
    || readResult.response.revision !== result.revision
    || readResult.envelope.sourceRevision !== result.revision) {
    return blocked(state, result, "blocked-stale", "target-read-revision-mismatch")
  }

  const binding = bindFrontendCoreWorkingSetFromTransportEnvelope(readResult.envelope)
  if (!binding.workingSet) {
    return blocked(
      state,
      result,
      "blocked-invalid",
      binding.failures[0]?.code ?? "target-read-blocked",
      binding.failures,
    )
  }
  const workingSet = binding.workingSet
  if (workingSet.document.packageVersion !== 3
    || workingSet.document.documentVersion !== 4
    || workingSet.document.runtimeMode !== "read-only") {
    return blocked(state, result, "blocked-invalid", "target-runtime-not-read-only")
  }

  const seed = createEditorSeedFromWorkingSet(workingSet)
  const selectedNodeId = workingSet.readModel.renderableNodeIds[0]
    ?? workingSet.readModel.visibleNodeIds[0]
    ?? null

  return {
    failures: [],
    issues: [],
    reason: null,
    state: {
      ...state,
      core: workingSet,
      seed,
      selection: createSelectionState(selectedNodeId, "document-migration:applied"),
      view: workingSet.readModel,
    },
    status: result.idempotency === "replayed" ? "replayed" : "applied",
  }
}
