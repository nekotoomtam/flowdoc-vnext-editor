export interface SelectionState {
  nodeId: string | null
  reason: string
}

export function createSelectionState(nodeId: string | null = null): SelectionState {
  return {
    nodeId,
    reason: nodeId ? "selected" : "none",
  }
}
