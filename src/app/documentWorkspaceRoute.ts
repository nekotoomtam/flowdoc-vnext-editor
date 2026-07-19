export type DocumentWorkspaceView = "design" | "preview"

export function resolveDocumentWorkspaceView(value: string | undefined): DocumentWorkspaceView | null {
  return value === "design" || value === "preview" ? value : null
}

export function createDocumentWorkspacePath(
  documentId: string,
  view: DocumentWorkspaceView,
): string {
  return `/documents/${encodeURIComponent(documentId)}/${view}`
}
