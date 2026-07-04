import { canExecuteCommand } from "../commands/commandPolicy"
import { normalizeCommandTargetNodeId } from "../commands/commandTargets"
import type {
  DeleteNodeCommand,
  DuplicateNodeCommand,
  ReorderNodeCommand,
} from "../commands/commandTypes"
import { createAdjacentSiblingReorderPlan } from "../commands/reorderPlacement"
import type { EditorRuntimeState } from "../runtime/editorState"
import type {
  BackendMutationOperation,
  BackendMutationRequest,
} from "./backendTransport"

export type BackendMutationCommand =
  | DeleteNodeCommand
  | DuplicateNodeCommand
  | ReorderNodeCommand

export type BackendMutationRequestBuildResult =
  | {
      request: BackendMutationRequest
      status: "ready"
    }
  | {
      reason: string
      status: "blocked"
    }

export interface CreateBackendMutationRequestOptions {
  requestId?: string
  timestamp?: number
}

function createRequestId(
  command: BackendMutationCommand,
  nodeId: string,
  baseRevision: number,
  timestamp: number,
): string {
  return `${command.kind}:${nodeId}:${baseRevision}:${timestamp}`
}

function resolveReorderToIndex(
  state: EditorRuntimeState,
  nodeId: string,
  command: ReorderNodeCommand,
): number | null {
  const plan = createAdjacentSiblingReorderPlan(state, nodeId, command.payload.direction)
  return plan.status === "ready" ? plan.toIndex : null
}

function createOperation(
  state: EditorRuntimeState,
  command: BackendMutationCommand,
  nodeId: string,
): BackendMutationOperation | null {
  if (command.kind === "node.reorder") {
    const toIndex = resolveReorderToIndex(state, nodeId, command)
    return toIndex === null
      ? null
      : {
          kind: command.kind,
          nodeId,
          toIndex,
        }
  }

  return {
    kind: command.kind,
    nodeId,
  }
}

export function createBackendMutationRequestFromCommand(
  state: EditorRuntimeState,
  command: BackendMutationCommand,
  options: CreateBackendMutationRequestOptions = {},
): BackendMutationRequestBuildResult {
  const policy = canExecuteCommand(command, state)
  if (!policy.allowed) {
    return {
      reason: policy.reason ?? "Command policy blocked backend mutation.",
      status: "blocked",
    }
  }

  const nodeId = normalizeCommandTargetNodeId(state, command.target.nodeId)
  const operation = createOperation(state, command, nodeId)
  if (!operation) {
    return {
      reason: `Unable to resolve backend mutation operation for ${command.kind}.`,
      status: "blocked",
    }
  }

  const timestamp = options.timestamp ?? Date.now()
  const baseRevision = state.core.envelope.documentRevision

  return {
    request: {
      baseRevision,
      documentId: state.core.envelope.documentId,
      operation,
      reason: command.reason,
      requestId: options.requestId ?? createRequestId(command, nodeId, baseRevision, timestamp),
      source: command.source,
    },
    status: "ready",
  }
}
