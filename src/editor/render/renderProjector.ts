import type { CoreEditorNodeSummary } from "../../core/coreTypes"
import type { EditorView } from "../runtime/editorView"
import type { RenderDocumentProjection, RenderNodeKind, RenderNodeSummary, RenderPageSummary } from "./renderTypes"

const PREVIEW_PAGE_WEIGHT_LIMIT = 8

function getRenderKind(node: CoreEditorNodeSummary): RenderNodeKind {
  if (node.type === "columns") return "columns"
  if (node.type === "heading" || node.textRole === "heading") return "heading"
  if (node.type === "page-break") return "page-break"
  if (node.type === "paragraph" || node.type === "text-block") return "paragraph"
  if (node.type === "table") return "table"
  if (node.type === "toc") return "toc"
  return "generic"
}

function getPreviewPageWeight(node: RenderNodeSummary): number {
  if (node.renderKind === "columns") return 3
  if (node.renderKind === "table") return 4
  if (node.renderKind === "heading") return 2
  if (node.renderKind === "toc") return 2
  if (node.renderKind === "page-break") return PREVIEW_PAGE_WEIGHT_LIMIT
  return 1
}

function isPreviewLabelNode(node: CoreEditorNodeSummary): boolean {
  return node.type === "text-block" || node.type === "heading" || node.type === "paragraph"
}

function getPreviewLabels(view: EditorView, node: CoreEditorNodeSummary): string[] {
  const representedNodeIds = view.presentation.representedNodeIdsBySurfaceId[node.id] ?? []

  return representedNodeIds
    .filter((nodeId) => nodeId !== node.id)
    .map((nodeId) => view.nodeById[nodeId])
    .filter((representedNode): representedNode is CoreEditorNodeSummary => (
      Boolean(representedNode) && isPreviewLabelNode(representedNode)
    ))
    .map((representedNode) => representedNode.label.trim())
    .filter(Boolean)
    .slice(0, 9)
}

function getPreviewColumnCount(view: EditorView, node: CoreEditorNodeSummary): number | null {
  if (node.type === "columns") {
    return Math.max(1, view.childrenById[node.id]?.length ?? 0)
  }

  if (node.type === "table") {
    const firstRowId = view.childrenById[node.id]?.[0]
    if (!firstRowId) return null

    return Math.max(1, view.childrenById[firstRowId]?.length ?? 0)
  }

  return null
}

function toRenderNodeSummary(view: EditorView, node: CoreEditorNodeSummary): RenderNodeSummary {
  return {
    childCount: view.childrenById[node.id]?.length ?? 0,
    id: node.id,
    label: node.label,
    parentId: node.parentId,
    previewColumnCount: getPreviewColumnCount(view, node),
    previewLabels: getPreviewLabels(view, node),
    renderKind: getRenderKind(node),
    sectionId: node.sectionId,
    type: node.type,
    zoneId: node.zoneId,
  }
}

export function projectRenderNodes(view: EditorView): RenderNodeSummary[] {
  return view.presentation.canvasSurfaceNodeIds
    .map((nodeId) => view.nodeById[nodeId])
    .filter((node): node is CoreEditorNodeSummary => Boolean(node))
    .map((node) => toRenderNodeSummary(view, node))
}

export function projectPreviewPages(view: EditorView): RenderPageSummary[] {
  const pages: RenderPageSummary[] = []
  let currentNodes: RenderNodeSummary[] = []
  let currentWeight = 0

  for (const node of projectRenderNodes(view)) {
    const nodeWeight = getPreviewPageWeight(node)
    if (currentNodes.length > 0 && currentWeight + nodeWeight > PREVIEW_PAGE_WEIGHT_LIMIT) {
      const pageNumber = pages.length + 1
      pages.push({
        id: `preview-page-${pageNumber}`,
        nodeIds: currentNodes.map((currentNode) => currentNode.id),
        nodes: currentNodes,
        pageNumber,
      })
      currentNodes = []
      currentWeight = 0
    }

    currentNodes.push(node)
    currentWeight += nodeWeight
  }

  if (currentNodes.length > 0) {
    const pageNumber = pages.length + 1
    pages.push({
      id: `preview-page-${pageNumber}`,
      nodeIds: currentNodes.map((currentNode) => currentNode.id),
      nodes: currentNodes,
      pageNumber,
    })
  }

  return pages
}

export function projectRenderDocument(view: EditorView): RenderDocumentProjection {
  return {
    pages: projectPreviewPages(view),
    revision: view.nodeOrder.length,
  }
}
