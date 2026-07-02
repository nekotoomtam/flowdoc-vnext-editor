export type EditorPresentationSurfaceType =
  | "columns"
  | "page-break"
  | "table"
  | "text-block"
  | "toc"

export type EditorPresentationNodeRole =
  | "context"
  | "internal"
  | "surface"
  | "unsupported"

export interface EditorPresentationOutlineItem {
  depth: number
  id: string
  label: string
  type: EditorPresentationSurfaceType
}

export interface EditorPresentationNode {
  id: string
  label: string
  parentId: string | null
  rawType: string
  representedBySurfaceId: string | null
  representedNodeIds: string[]
  role: EditorPresentationNodeRole
  selectionTargetId: string | null
  surfaceType: EditorPresentationSurfaceType | null
}

export interface EditorNodePresentation {
  canvasSurfaceNodeIds: string[]
  outlineItems: EditorPresentationOutlineItem[]
  presentationNodeById: Record<string, EditorPresentationNode>
  representedNodeIdsBySurfaceId: Record<string, string[]>
  selectionTargetByNodeId: Record<string, string | null>
}
