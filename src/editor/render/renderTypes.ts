export type RenderNodeKind =
  | "columns"
  | "generic"
  | "heading"
  | "page-break"
  | "paragraph"
  | "table"
  | "toc"

export interface RenderNodeSummary {
  childCount: number
  id: string
  label: string
  parentId: string | null
  renderKind: RenderNodeKind
  sectionId: string | null
  type: string
  zoneId: string | null
}

export interface RenderPageSummary {
  id: string
  nodeIds: string[]
  nodes: RenderNodeSummary[]
  pageNumber: number
}

export interface RenderDocumentProjection {
  pages: RenderPageSummary[]
  revision: number
}
