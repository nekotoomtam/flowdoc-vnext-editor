import type { NodeCommandCapabilities } from "../coreBinding/capabilityMirror"
import type { EditorRuntimeState } from "../runtime/editorState"
import { resolveEditorSelectionTarget } from "../runtime/editorView"

export interface CommandNodeTargetResolution {
  capabilities: NodeCommandCapabilities | null
  inputNodeExists: boolean
  inputNodeId: string
  nodeId: string | null
  operationSurface: string | null
  representedNodeIds: string[]
}

export function resolveCommandNodeTarget(
  state: EditorRuntimeState,
  nodeId: string,
): CommandNodeTargetResolution {
  const inputNode = state.view.nodeById[nodeId] ?? null
  const surfaceNodeId = inputNode ? resolveEditorSelectionTarget(state.view, nodeId) : null
  const surfaceNode = surfaceNodeId ? state.view.nodeById[surfaceNodeId] ?? null : null
  const presentationNode = surfaceNodeId
    ? state.view.presentation.presentationNodeById[surfaceNodeId] ?? null
    : null

  return {
    capabilities: surfaceNodeId ? state.core.capabilities.byNodeId[surfaceNodeId] ?? null : null,
    inputNodeExists: Boolean(inputNode),
    inputNodeId: nodeId,
    nodeId: surfaceNode?.id ?? null,
    operationSurface: presentationNode?.operationSurface ?? surfaceNode?.operationSurface ?? null,
    representedNodeIds: surfaceNodeId
      ? [...(state.view.presentation.representedNodeIdsBySurfaceId[surfaceNodeId] ?? [])]
      : [],
  }
}

export function normalizeCommandTargetNodeId(
  state: EditorRuntimeState,
  nodeId: string,
): string {
  return resolveCommandNodeTarget(state, nodeId).nodeId ?? nodeId
}
