import type {
  CoreEditorNearestContext,
  CoreEditorNodeCapabilities,
  CoreEditorOperationSurface,
  CoreEditorTextRole,
} from "../../core/coreTypes"

export type EditorPresentationSurfaceType =
  | "columns"
  | "image"
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
  capabilities: CoreEditorNodeCapabilities | null
  id: string
  label: string
  nearest: CoreEditorNearestContext | null
  operationSurface: CoreEditorOperationSurface | null
  parentId: string | null
  rawType: string
  representedBySurfaceId: string | null
  representedNodeIds: string[]
  role: EditorPresentationNodeRole
  selectionTargetId: string | null
  surfaceType: EditorPresentationSurfaceType | null
  textRole: CoreEditorTextRole | null
}

export interface EditorNodePresentation {
  canvasSurfaceNodeIds: string[]
  outlineItems: EditorPresentationOutlineItem[]
  presentationNodeById: Record<string, EditorPresentationNode>
  representedNodeIdsBySurfaceId: Record<string, string[]>
  selectionTargetByNodeId: Record<string, string | null>
}
