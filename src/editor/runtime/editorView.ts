import type {
  CoreEditorNodeSummary,
  CoreEditorSectionSummary,
  CoreEditorSeed,
  CoreEditorZoneSummary,
} from "../../core/coreTypes"
import {
  createNodePresentation,
  resolvePresentationSelectionTarget,
} from "../presentation/nodePresentationProjector"
import type {
  EditorNodePresentation,
  EditorPresentationOutlineItem,
} from "../presentation/nodePresentationTypes"

export type EditorOutlineItem = EditorPresentationOutlineItem

export interface EditorInspectorFacts {
  childCount: number
  id: string
  label: string
  parentId: string | null
  sectionId: string | null
  type: string
  zoneId: string | null
}

export interface EditorView {
  changedSubtreeIds: string[]
  childrenById: Record<string, string[]>
  dirtyNodeIds: string[]
  nodeById: Record<string, CoreEditorNodeSummary>
  nodeOrder: string[]
  outlineItems: EditorOutlineItem[]
  parentById: Record<string, string | null>
  presentation: EditorNodePresentation
  renderableNodeIds: string[]
  sectionById: Record<string, CoreEditorSectionSummary>
  tableIds: string[]
  textBlockIds: string[]
  visibleNodeIds: string[]
  zoneById: Record<string, CoreEditorZoneSummary>
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]))
}

function isTextLikeType(type: string): boolean {
  return type === "text-block" || type === "heading" || type === "paragraph"
}

export function createEditorView(seed: CoreEditorSeed): EditorView {
  const nodeById = indexById(seed.nodes)
  const sectionById = indexById(seed.sections)
  const zoneById = indexById(seed.zones)
  const parentById = Object.fromEntries(seed.nodes.map((node) => [node.id, node.parentId]))
  const childrenById = Object.fromEntries(seed.nodes.map((node) => [node.id, node.childIds]))
  const nodeOrder = seed.nodes.map((node) => node.id)
  const visibleNodeIds = nodeOrder.filter((nodeId) => nodeId !== "root")
  const presentation = createNodePresentation({
    childrenById,
    nodeById,
    nodeOrder,
  })
  const renderableNodeIds = [...presentation.canvasSurfaceNodeIds]

  return {
    changedSubtreeIds: [],
    childrenById,
    dirtyNodeIds: [],
    nodeById,
    nodeOrder,
    outlineItems: presentation.outlineItems,
    parentById,
    presentation,
    renderableNodeIds,
    sectionById,
    tableIds: seed.nodes.filter((node) => node.type === "table").map((node) => node.id),
    textBlockIds: seed.nodes.filter((node) => isTextLikeType(node.type)).map((node) => node.id),
    visibleNodeIds,
    zoneById,
  }
}

export function getNodeById(view: EditorView, nodeId: string): CoreEditorNodeSummary | null {
  return view.nodeById[nodeId] ?? null
}

export function getChildren(view: EditorView, nodeId: string): CoreEditorNodeSummary[] {
  return (view.childrenById[nodeId] ?? [])
    .map((childId) => view.nodeById[childId])
    .filter((node): node is CoreEditorNodeSummary => Boolean(node))
}

export function getOutlineItems(view: EditorView): EditorOutlineItem[] {
  return view.outlineItems
}

export function resolveEditorSelectionTarget(view: EditorView, nodeId: string | null): string | null {
  return resolvePresentationSelectionTarget(view.presentation, nodeId)
}

export function getInspectorFacts(view: EditorView, nodeId: string | null): EditorInspectorFacts | null {
  const selectionTargetId = resolveEditorSelectionTarget(view, nodeId)
  if (!selectionTargetId) return null

  const node = getNodeById(view, selectionTargetId)
  if (!node) return null

  return {
    childCount: view.childrenById[node.id]?.length ?? 0,
    id: node.id,
    label: node.label,
    parentId: node.parentId,
    sectionId: node.sectionId,
    type: node.type,
    zoneId: node.zoneId,
  }
}
