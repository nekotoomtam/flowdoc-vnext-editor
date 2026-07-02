import type { CoreEditorNodeSummary } from "../../core/coreTypes"
import type {
  EditorNodePresentation,
  EditorPresentationNode,
  EditorPresentationNodeRole,
  EditorPresentationSurfaceType,
} from "./nodePresentationTypes"

export interface CreateNodePresentationInput {
  childrenById: Record<string, string[]>
  nodeById: Record<string, CoreEditorNodeSummary>
  nodeOrder: string[]
}

const CONTEXT_NODE_TYPES = new Set(["document", "section", "zone"])
const SURFACE_TYPE_BY_NODE_TYPE: Record<string, EditorPresentationSurfaceType | undefined> = {
  columns: "columns",
  heading: "text-block",
  "page-break": "page-break",
  paragraph: "text-block",
  table: "table",
  "text-block": "text-block",
  toc: "toc",
}

function getSurfaceType(type: string): EditorPresentationSurfaceType | null {
  return SURFACE_TYPE_BY_NODE_TYPE[type] ?? null
}

function getNodeRole(
  node: CoreEditorNodeSummary,
  surfaceType: EditorPresentationSurfaceType | null,
  isCanvasSurface: boolean,
): EditorPresentationNodeRole {
  if (isCanvasSurface) return "surface"
  if (CONTEXT_NODE_TYPES.has(node.type)) return "context"
  if (surfaceType || node.parentId) return "internal"
  return "unsupported"
}

function cloneRepresentedNodes(
  representedNodeIdsBySurfaceId: Record<string, string[]>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(representedNodeIdsBySurfaceId).map(([surfaceId, nodeIds]) => [
      surfaceId,
      [...nodeIds],
    ]),
  )
}

export function createNodePresentation({
  childrenById,
  nodeById,
  nodeOrder,
}: CreateNodePresentationInput): EditorNodePresentation {
  const canvasSurfaceNodeIds: string[] = []
  const outlineItems: EditorNodePresentation["outlineItems"] = []
  const presentationNodeById: Record<string, EditorPresentationNode> = {}
  const representedNodeIdsBySurfaceId: Record<string, string[]> = {}
  const selectionTargetByNodeId: Record<string, string | null> = {}
  const visited = new Set<string>()

  const visit = (nodeId: string, owningSurfaceId: string | null, depth: number): void => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodeById[nodeId]
    if (!node) return

    const surfaceType = getSurfaceType(node.type)
    const isCanvasSurface = Boolean(surfaceType) && owningSurfaceId === null
    const representedBySurfaceId = isCanvasSurface ? node.id : owningSurfaceId
    const selectionTargetId = representedBySurfaceId
    const role = getNodeRole(node, surfaceType, isCanvasSurface)

    if (isCanvasSurface && surfaceType) {
      canvasSurfaceNodeIds.push(node.id)
      representedNodeIdsBySurfaceId[node.id] = []
      outlineItems.push({
        depth,
        id: node.id,
        label: node.label,
        type: surfaceType,
      })
    }

    if (representedBySurfaceId) {
      representedNodeIdsBySurfaceId[representedBySurfaceId] ??= []
      representedNodeIdsBySurfaceId[representedBySurfaceId].push(node.id)
    }

    selectionTargetByNodeId[node.id] = selectionTargetId
    presentationNodeById[node.id] = {
      id: node.id,
      label: node.label,
      parentId: node.parentId,
      rawType: node.type,
      representedBySurfaceId,
      representedNodeIds: [],
      role,
      selectionTargetId,
      surfaceType,
    }

    for (const childId of childrenById[node.id] ?? []) {
      visit(childId, representedBySurfaceId, isCanvasSurface ? depth + 1 : depth)
    }
  }

  for (const nodeId of nodeOrder) {
    if (!visited.has(nodeId)) visit(nodeId, null, 0)
  }

  for (const [nodeId, presentationNode] of Object.entries(presentationNodeById)) {
    const representedNodeIds = presentationNode.role === "surface"
      ? representedNodeIdsBySurfaceId[nodeId] ?? []
      : []

    presentationNodeById[nodeId] = {
      ...presentationNode,
      representedNodeIds: [...representedNodeIds],
    }
  }

  return {
    canvasSurfaceNodeIds,
    outlineItems,
    presentationNodeById,
    representedNodeIdsBySurfaceId: cloneRepresentedNodes(representedNodeIdsBySurfaceId),
    selectionTargetByNodeId: { ...selectionTargetByNodeId },
  }
}

export function resolvePresentationSelectionTarget(
  presentation: EditorNodePresentation,
  nodeId: string | null,
): string | null {
  if (!nodeId) return null

  return presentation.selectionTargetByNodeId[nodeId] ?? null
}
