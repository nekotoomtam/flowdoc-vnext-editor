import type { EditorReadModel } from "./readModel"

export interface GlobalCommandCapabilities {
  canCommitMutation: boolean
  canOpenTextDraft: boolean
  canRequestExactLayout: boolean
  canRequestLiveLayout: boolean
}

export interface NodeCommandCapabilities {
  canInsertFieldChip: boolean
  canOpenTextDraft: boolean
  deletable: boolean
  editable: boolean
  reasons: string[]
  reorderable: boolean
  selectable: boolean
}

export interface CommandCapabilityMirror {
  byNodeId: Record<string, NodeCommandCapabilities>
  global: GlobalCommandCapabilities
  revision: number
  sourceRevision: number
}

function createNodeCapabilities(readModel: EditorReadModel, nodeId: string): NodeCommandCapabilities {
  const editable = readModel.textBlockIds.includes(nodeId)

  return {
    canInsertFieldChip: editable,
    canOpenTextDraft: editable,
    deletable: false,
    editable,
    reasons: editable ? [] : ["Phase 1 only opens draft capabilities for text-like nodes"],
    reorderable: false,
    selectable: Boolean(readModel.nodeById[nodeId]),
  }
}

export function createCommandCapabilityMirror(readModel: EditorReadModel): CommandCapabilityMirror {
  return {
    byNodeId: Object.fromEntries(
      readModel.nodeOrder.map((nodeId) => [nodeId, createNodeCapabilities(readModel, nodeId)]),
    ),
    global: {
      canCommitMutation: false,
      canOpenTextDraft: false,
      canRequestExactLayout: false,
      canRequestLiveLayout: true,
    },
    revision: readModel.revision,
    sourceRevision: readModel.sourceRevision,
  }
}
