export interface SelectionState {
  selectedNodeId: string | null
  selectionReason: string
}

export function createSelectionState(
  selectedNodeId: string | null = null,
  selectionReason = selectedNodeId ? "selected" : "none",
): SelectionState {
  return {
    selectedNodeId,
    selectionReason,
  }
}

export function selectNode(selection: SelectionState, nodeId: string, reason: string): SelectionState {
  return {
    ...selection,
    selectedNodeId: nodeId,
    selectionReason: reason,
  }
}
