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
  duplicable: boolean
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
  const coreCapabilities = readModel.nodeById[nodeId]?.capabilities
  const editable = coreCapabilities?.canContainText ?? readModel.textBlockIds.includes(nodeId)

  return {
    canInsertFieldChip: editable,
    canOpenTextDraft: editable,
    deletable: coreCapabilities?.canBeDeleted ?? false,
    duplicable: coreCapabilities?.canBeDuplicated ?? false,
    editable,
    reasons: editable ? [] : ["Operation surface cannot open a text draft"],
    reorderable: coreCapabilities?.canBeReordered ?? false,
    selectable: Boolean(readModel.nodeById[nodeId]),
  }
}

export function createCommandCapabilityMirror(
  readModel: EditorReadModel,
  options: { readOnly?: boolean } = {},
): CommandCapabilityMirror {
  return {
    byNodeId: Object.fromEntries(
      readModel.nodeOrder.map((nodeId) => [nodeId, createNodeCapabilities(readModel, nodeId)]),
    ),
    global: {
      canCommitMutation: false,
      canOpenTextDraft: false,
      canRequestExactLayout: false,
      canRequestLiveLayout: options.readOnly !== true,
    },
    revision: readModel.revision,
    sourceRevision: readModel.sourceRevision,
  }
}
