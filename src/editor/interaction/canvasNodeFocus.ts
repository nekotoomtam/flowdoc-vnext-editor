export function findCanvasNodeButton(root: ParentNode | null, nodeId: string): HTMLButtonElement | null {
  if (!root) return null

  return Array.from(root.querySelectorAll<HTMLButtonElement>(".paper-block[data-node-id]"))
    .find((nodeElement) => nodeElement.dataset.nodeId === nodeId) ?? null
}

export function focusCanvasNodeButton(root: ParentNode | null, nodeId: string): boolean {
  const nodeElement = findCanvasNodeButton(root, nodeId)
  if (!nodeElement) return false

  nodeElement.focus()
  return true
}
