import { canExecuteCommand } from "../commands/commandPolicy"
import { normalizeCommandTargetNodeId } from "../commands/commandTargets"
import type {
  DeleteNodeCommand,
  DuplicateNodeCommand,
  ReorderNodeCommand,
} from "../commands/commandTypes"
import {
  createAdjacentSiblingReorderPlan,
  createCanvasAdjacentSiblingReorderPlan,
} from "../commands/reorderPlacement"
import type { EditorRuntimeState } from "../runtime/editorState"
import type {
  BackendMutationOperation,
  BackendMutationRequest,
  BackendMutationSource,
} from "./backendTransport"
import { parseCoreInlineNodeV4TargetList } from "../../core/coreAdapter"

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

export interface CreateBackendRichInlineMutationRequestOptions
  extends CreateBackendMutationRequestOptions {
  children: unknown
  reason?: string
  source: BackendMutationSource
  textBlockId: string
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
  if ("toIndex" in command.payload && command.payload.toIndex !== undefined) {
    const parentId = state.view.parentById[nodeId]
    if (!parentId) return null

    const siblings = state.view.childrenById[parentId] ?? []
    const currentIndex = siblings.indexOf(nodeId)
    if (currentIndex < 0) return null
    if (command.payload.toIndex === currentIndex) return null

    return command.payload.toIndex >= 0 && command.payload.toIndex < siblings.length
      ? command.payload.toIndex
      : null
  }

  const plan = command.source === "keyboard"
    ? createCanvasAdjacentSiblingReorderPlan(state, nodeId, command.payload.direction)
    : createAdjacentSiblingReorderPlan(state, nodeId, command.payload.direction)
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

export function createBackendRichInlineMutationRequest(
  state: EditorRuntimeState,
  options: CreateBackendRichInlineMutationRequestOptions,
): BackendMutationRequestBuildResult {
  if (state.core.envelope.status !== "fresh") {
    return { reason: "Rich-inline mutation requires a fresh core envelope.", status: "blocked" }
  }
  if (state.core.document.packageVersion !== 3 || state.core.document.documentVersion !== 4) {
    return { reason: "Rich-inline mutation requires package 3/document 4.", status: "blocked" }
  }
  if (state.view.nodeById[options.textBlockId]?.type !== "text-block") {
    return { reason: `Text block ${options.textBlockId} is not available.`, status: "blocked" }
  }
  const parsed = parseCoreInlineNodeV4TargetList(options.children)
  if (parsed.status === "invalid") return { reason: parsed.reason, status: "blocked" }

  const baseRevision = state.core.envelope.documentRevision
  const timestamp = options.timestamp ?? Date.now()
  return {
    request: {
      baseRevision,
      documentId: state.core.envelope.documentId,
      operation: {
        kind: "text-block.rich-inline.replace",
        textBlockId: options.textBlockId,
        children: parsed.children,
      },
      reason: options.reason,
      requestId: options.requestId
        ?? `text-block.rich-inline.replace:${options.textBlockId}:${baseRevision}:${timestamp}`,
      source: options.source,
    },
    status: "ready",
  }
}
