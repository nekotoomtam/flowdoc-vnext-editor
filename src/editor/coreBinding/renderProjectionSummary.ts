import type { RenderDocumentProjection, RenderPageSummary } from "../render/renderTypes"

export type RenderProjectionKind = "exact-readonly" | "live" | "placeholder"

export interface RenderProjectionSummary {
  blockCount: number
  documentId: string
  kind: RenderProjectionKind
  layoutGeneration: string | null
  nodeToBlockIds: Record<string, string[]>
  nodeToFragmentIds: Record<string, string[]>
  pageCount: number
  projectionId: string
  sourceRevision: number
  stale: boolean
}

export interface RenderProjectionSummaryOptions {
  documentId?: string
  kind?: RenderProjectionKind
  layoutGeneration?: string | null
  projectionId?: string
  sourceRevision?: number
  stale?: boolean
}

function mapNodesToProjectionIds(
  pages: RenderPageSummary[],
  idKind: "block" | "fragment",
): Record<string, string[]> {
  const entries = pages.flatMap((page) =>
    page.nodeIds.map((nodeId) => [nodeId, `${page.id}:${idKind}:${nodeId}`] as const),
  )

  return entries.reduce<Record<string, string[]>>((mapping, [nodeId, projectionId]) => {
    return {
      ...mapping,
      [nodeId]: [...(mapping[nodeId] ?? []), projectionId],
    }
  }, {})
}

export function createRenderProjectionSummary(
  projection: RenderDocumentProjection,
  options: RenderProjectionSummaryOptions = {},
): RenderProjectionSummary {
  const kind = options.kind ?? "placeholder"
  const sourceRevision = options.sourceRevision ?? projection.revision

  return {
    blockCount: projection.pages.reduce((count, page) => count + page.nodeIds.length, 0),
    documentId: options.documentId ?? "unknown-document",
    kind,
    layoutGeneration: options.layoutGeneration ?? null,
    nodeToBlockIds: mapNodesToProjectionIds(projection.pages, "block"),
    nodeToFragmentIds: mapNodesToProjectionIds(projection.pages, "fragment"),
    pageCount: projection.pages.length,
    projectionId: options.projectionId ?? `projection:${sourceRevision}:${kind}`,
    sourceRevision,
    stale: options.stale ?? false,
  }
}
