import type { CoreEditorNodeSummary } from "../../core/coreTypes"
import type { EditorView } from "../runtime/editorView"
import type { RenderDocumentProjection, RenderNodeKind, RenderNodeSummary, RenderPageSummary } from "./renderTypes"

const PREVIEW_PAGE_WEIGHT_LIMIT = 8

function getRenderKind(type: string): RenderNodeKind {
  if (type === "columns") return "columns"
  if (type === "heading") return "heading"
  if (type === "page-break") return "page-break"
  if (type === "paragraph" || type === "text-block") return "paragraph"
  if (type === "table") return "table"
  if (type === "toc") return "toc"
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

function toRenderNodeSummary(view: EditorView, node: CoreEditorNodeSummary): RenderNodeSummary {
  return {
    childCount: view.childrenById[node.id]?.length ?? 0,
    id: node.id,
    label: node.label,
    parentId: node.parentId,
    renderKind: getRenderKind(node.type),
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
