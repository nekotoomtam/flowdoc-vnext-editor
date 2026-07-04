import { bindFrontendCoreWorkingSetFromTransportEnvelope } from "../coreBinding/workingSetFactory"
import type { CoreReadBindingFailure } from "../../core/coreTypes"
import {
  createBackendMutationReadEnvelope,
  type BackendMutationIssue,
  type BackendMutationResultEnvelope,
} from "../backend/backendTransport"
import { createSelectionState } from "../selection/selectionState"
import type { EditorRuntimeState } from "./editorState"
import { createEditorSeedFromWorkingSet } from "./runtimeCoreBinding"

export type RuntimeBackendMutationApplyStatus =
  | "applied"
  | "blocked-invalid"
  | "blocked-stale"
  | "rejected"
  | "stale"

export interface RuntimeBackendMutationApply {
  failures: CoreReadBindingFailure[]
  issues: BackendMutationIssue[]
  reason: string | null
  state: EditorRuntimeState
  status: RuntimeBackendMutationApplyStatus
}

function staleReason(state: EditorRuntimeState, result: BackendMutationResultEnvelope): string | null {
  if (result.documentId !== state.core.envelope.documentId) return "document-mismatch"
  if (state.core.envelope.status !== "fresh") return "envelope-not-fresh"
  if (result.baseRevision !== state.core.envelope.documentRevision) return "base-revision-mismatch"
  return null
}

function nonAppliedMutationReason(result: BackendMutationResultEnvelope): string {
  return result.issues[0]?.code ?? result.status
}

function resolveSelectableTarget(
  nextView: EditorRuntimeState["view"],
  nodeId: string,
): string | null {
  const selectionTargetId = nextView.presentation.selectionTargetByNodeId[nodeId] ?? null
  return selectionTargetId && nextView.nodeById[selectionTargetId] ? selectionTargetId : null
}

function selectAfterDelete(
  state: EditorRuntimeState,
  result: BackendMutationResultEnvelope,
  nextView: EditorRuntimeState["view"],
): string | null {
  if (result.operationKind !== "node.delete") return null

  for (const deletedNodeId of result.targetNodeIds) {
    const parentId = state.view.parentById[deletedNodeId]
    if (!parentId) continue

    const siblings = state.view.childrenById[parentId] ?? []
    const deletedIndex = siblings.indexOf(deletedNodeId)
    if (deletedIndex < 0) continue

    const recoveryCandidates = [
      ...siblings.slice(0, deletedIndex).reverse(),
      ...siblings.slice(deletedIndex + 1),
    ]
    const recoveryTarget = recoveryCandidates
      .map((nodeId) => resolveSelectableTarget(nextView, nodeId))
      .find((nodeId): nodeId is string => Boolean(nodeId))

    if (recoveryTarget) return recoveryTarget
  }

  return null
}

function selectAfterMutation(
  state: EditorRuntimeState,
  result: BackendMutationResultEnvelope,
  nextView: EditorRuntimeState["view"],
): string | null {
  const preferredTarget = [...result.targetNodeIds]
    .reverse()
    .map((nodeId) => resolveSelectableTarget(nextView, nodeId))
    .find((nodeId): nodeId is string => Boolean(nodeId))
  if (preferredTarget) return preferredTarget

  const deleteRecoveryTarget = selectAfterDelete(state, result, nextView)
  if (deleteRecoveryTarget) return deleteRecoveryTarget

  const currentSelection = state.selection.selectedNodeId
  if (currentSelection) {
    const currentSelectionTarget = resolveSelectableTarget(nextView, currentSelection)
    if (currentSelectionTarget) return currentSelectionTarget
  }

  return nextView.renderableNodeIds[0] ?? nextView.visibleNodeIds[0] ?? null
}

export function applyRuntimeBackendMutationResult(
  state: EditorRuntimeState,
  result: BackendMutationResultEnvelope,
): RuntimeBackendMutationApply {
  if (result.status !== "applied") {
    return {
      failures: [],
      issues: result.issues,
      reason: nonAppliedMutationReason(result),
      state,
      status: result.status,
    }
  }

  const reason = staleReason(state, result)
  if (reason) {
    return {
      failures: [],
      issues: result.issues,
      reason,
      state,
      status: "blocked-stale",
    }
  }

  const envelope = createBackendMutationReadEnvelope(result)
  if (!envelope) {
    return {
      failures: [],
      issues: result.issues,
      reason: "missing-read-envelope",
      state,
      status: "blocked-invalid",
    }
  }

  const binding = bindFrontendCoreWorkingSetFromTransportEnvelope(envelope, {
    documentId: state.core.envelope.documentId,
    documentRevision: state.core.envelope.documentRevision,
  })

  if (!binding.workingSet) {
    return {
      failures: binding.failures,
      issues: result.issues,
      reason: binding.failures[0]?.code ?? "blocked-read-envelope",
      state,
      status: "blocked-stale",
    }
  }

  const seed = createEditorSeedFromWorkingSet(binding.workingSet)
  const selectedNodeId = selectAfterMutation(state, result, binding.workingSet.readModel)

  return {
    failures: [],
    issues: [],
    reason: null,
    state: {
      ...state,
      core: binding.workingSet,
      seed,
      selection: createSelectionState(selectedNodeId, `${result.operationKind}:applied`),
      view: binding.workingSet.readModel,
    },
    status: "applied",
  }
}
