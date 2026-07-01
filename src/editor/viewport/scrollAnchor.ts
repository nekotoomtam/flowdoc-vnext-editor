export interface ScrollAnchor {
  nodeId: string
  reason: string
}

export function createScrollAnchor(nodeId: string, reason: string): ScrollAnchor {
  return {
    nodeId,
    reason,
  }
}
