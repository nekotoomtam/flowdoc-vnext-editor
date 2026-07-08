import type { CoreEditorNodeSummary } from "../../core/coreTypes"
import {
  getPaperPreviewFlowCapacityPx,
  getPaperPreviewFlowMetrics,
  type PaperPreviewFlowMetricsOptions,
} from "../paper/paperFlowMetrics"
import type { EditorView } from "../runtime/editorView"
import type { RenderDocumentProjection, RenderNodeKind, RenderNodeSummary, RenderPageSummary } from "./renderTypes"

export type PreviewPaginationOptions = PaperPreviewFlowMetricsOptions

function getRenderKind(node: CoreEditorNodeSummary): RenderNodeKind {
  if (node.type === "columns") return "columns"
  if (node.type === "heading" || node.textRole === "heading") return "heading"
  if (node.type === "page-break") return "page-break"
  if (node.type === "paragraph" || node.type === "text-block") return "paragraph"
  if (node.type === "table") return "table"
  if (node.type === "toc") return "toc"
  return "generic"
}

export function getPreviewPageFlowCapacityPx(options: PreviewPaginationOptions = {}): number {
  return getPaperPreviewFlowCapacityPx(options)
}

export function getEstimatedRenderNodeHeightPx(
  node: RenderNodeSummary,
  options: PreviewPaginationOptions = {},
): number {
  if (node.renderKind === "columns") {
    const labelRows = Math.max(1, Math.ceil(node.previewLabels.length / Math.max(1, node.previewColumnCount ?? 1)))
    return 132 + labelRows * 20
  }
  if (node.renderKind === "table") {
    const previewRows = Math.max(1, Math.ceil(node.previewLabels.length / Math.max(1, node.previewColumnCount ?? 1)))
    return 78 + previewRows * 34
  }
  if (node.renderKind === "heading") return 68
  if (node.renderKind === "toc") return 92
  if (node.renderKind === "page-break") return getPreviewPageFlowCapacityPx(options)
  return 58
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

function toRenderNodeSummary(
  view: EditorView,
  node: CoreEditorNodeSummary,
  options: PreviewPaginationOptions,
): RenderNodeSummary {
  const summaryWithoutEstimate = {
    childCount: view.childrenById[node.id]?.length ?? 0,
    estimatedHeightPx: 0,
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

  return {
    ...summaryWithoutEstimate,
    estimatedHeightPx: getEstimatedRenderNodeHeightPx(summaryWithoutEstimate, options),
  }
}

export function projectRenderNodes(
  view: EditorView,
  options: PreviewPaginationOptions = {},
): RenderNodeSummary[] {
  return view.presentation.canvasSurfaceNodeIds
    .map((nodeId) => view.nodeById[nodeId])
    .filter((node): node is CoreEditorNodeSummary => Boolean(node))
    .map((node) => toRenderNodeSummary(view, node, options))
}

function createRenderPageSummary(
  nodes: RenderNodeSummary[],
  pageNumber: number,
  flowCapacityPx: number,
  blockGapPx: number,
): RenderPageSummary {
  const estimatedContentHeightPx = nodes.reduce((height, node, index) => (
    height + node.estimatedHeightPx + (index === 0 ? 0 : blockGapPx)
  ), 0)
  const overflowStatus = estimatedContentHeightPx <= flowCapacityPx
    ? "fits"
    : nodes.length === 1
      ? "single-node-overflow"
      : "multi-node-overflow"

  return {
    estimatedContentHeightPx,
    flowCapacityPx,
    id: `preview-page-${pageNumber}`,
    nodeIds: nodes.map((node) => node.id),
    nodes,
    overflowStatus,
    pageNumber,
  }
}

export function projectPreviewPages(view: EditorView, options: PreviewPaginationOptions = {}): RenderPageSummary[] {
  const pages: RenderPageSummary[] = []
  let currentNodes: RenderNodeSummary[] = []
  let currentHeightPx = 0
  const flowMetrics = getPaperPreviewFlowMetrics(options)
  const { blockGapPx, flowCapacityPx } = flowMetrics

  for (const node of projectRenderNodes(view, options)) {
    const nextHeightPx = currentHeightPx
      + node.estimatedHeightPx
      + (currentNodes.length === 0 ? 0 : blockGapPx)

    if (currentNodes.length > 0 && nextHeightPx > flowCapacityPx) {
      pages.push(createRenderPageSummary(currentNodes, pages.length + 1, flowCapacityPx, blockGapPx))
      currentNodes = []
      currentHeightPx = 0
    }

    currentNodes.push(node)
    currentHeightPx += node.estimatedHeightPx + (currentNodes.length === 1 ? 0 : blockGapPx)
  }

  if (currentNodes.length > 0) {
    pages.push(createRenderPageSummary(currentNodes, pages.length + 1, flowCapacityPx, blockGapPx))
  }

  return pages
}

export function projectRenderDocument(
  view: EditorView,
  options: PreviewPaginationOptions = {},
): RenderDocumentProjection {
  return {
    pages: projectPreviewPages(view, options),
    revision: view.nodeOrder.length,
  }
}
