export type ViewportAnchorAlign = "center" | "start"
export type ViewportAnchorKind = "node" | "page" | "section"

export interface ViewportAnchor {
  align: ViewportAnchorAlign
  id: string
  kind: ViewportAnchorKind
  offset: number
  reason: string
  targetId: string
}

export interface ViewportState {
  contentHeight: number
  contentWidth: number
  pendingAnchor: ViewportAnchor | null
  renderWindowPageIds: string[]
  revision: number
  scrollLeft: number
  scrollTop: number
  viewportHeight: number
  viewportWidth: number
  visiblePageIds: string[]
  zoom: number
}

export type ViewportAction =
  | {
      contentHeight?: number
      contentWidth?: number
      kind: "viewport.measured"
      viewportHeight: number
      viewportWidth: number
    }
  | {
      kind: "viewport.scrolled"
      scrollLeft: number
      scrollTop: number
      visiblePageIds?: string[]
    }
  | {
      contentHeight: number
      contentWidth: number
      kind: "viewport.scrollRootSynced"
      scrollLeft: number
      scrollTop: number
      viewportHeight: number
      viewportWidth: number
      visiblePageIds?: string[]
    }
  | {
      anchor?: Omit<ViewportAnchor, "id">
      kind: "viewport.setZoom"
      zoom: number
    }
  | {
      align: ViewportAnchorAlign
      kind: "viewport.jumpToNode"
      nodeId: string
      reason: string
    }
  | {
      anchorId: string
      kind: "viewport.anchorApplied"
    }
