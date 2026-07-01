import type { RenderDocumentProjection, RenderPageSummary } from "../render/renderTypes"

export type RenderProjectionKind = "exact-readonly" | "live" | "placeholder"

export interface RenderProjectionCache {
  kind: RenderProjectionKind
  layoutGeneration: string | null
  nodeToBlocks: Record<string, string[]>
  nodeToFragments: Record<string, string[]>
  pages: RenderPageSummary[]
  projectionId: string
  sourceRevision: number
  stale: boolean
}

export interface RenderProjectionCacheOptions {
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

export function createRenderProjectionCache(
  projection: RenderDocumentProjection,
  options: RenderProjectionCacheOptions = {},
): RenderProjectionCache {
  const kind = options.kind ?? "placeholder"
  const sourceRevision = options.sourceRevision ?? projection.revision

  return {
    kind,
    layoutGeneration: options.layoutGeneration ?? null,
    nodeToBlocks: mapNodesToProjectionIds(projection.pages, "block"),
    nodeToFragments: mapNodesToProjectionIds(projection.pages, "fragment"),
    pages: projection.pages,
    projectionId: options.projectionId ?? `projection:${sourceRevision}:${kind}`,
    sourceRevision,
    stale: options.stale ?? false,
  }
}
