export interface HitTestResult {
  nodeId: string | null
  x: number
  y: number
}

export function createEmptyHitTest(x = 0, y = 0): HitTestResult {
  return {
    nodeId: null,
    x,
    y,
  }
}
