import type { CoreEditorNodeSummary, CoreEditorSeed } from "./coreTypes"

type CoreRuntimeInlineNode =
  | { type: "field-ref"; fallback?: string; key: string; label?: string }
  | { type: "line-break" }
  | { type: "page-number" }
  | { type: "text"; text: string }

type CoreRuntimeAuthoredNode = {
  children?: CoreRuntimeInlineNode[]
  id: string
  props?: Record<string, unknown>
  role?: unknown
  type: string
}

type CoreRuntimeParentRef =
  | { kind: "column"; columnId: string }
  | { kind: "columns"; columnsId: string }
  | { kind: "section"; sectionId: string }
  | { kind: "table"; tableId: string }
  | { kind: "table-cell"; cellId: string }
  | { kind: "table-row"; rowId: string }
  | { kind: "zone"; zoneId: string }

type CoreRuntimeZoneNode = {
  id: string
  role: string
}

export interface CoreRuntimeSessionForSeed {
  diagnostics: {
    graphIssueCount: number
  }
  document: {
    document: {
      id: string
      sections: Array<{
        id: string
        zoneIds: string[]
      }>
    }
  }
  documentVersion: number
  graph: {
    childrenByNodeId: Map<string, readonly string[]>
    nodesById: Map<string, CoreRuntimeAuthoredNode>
    parentByNodeId: Map<string, CoreRuntimeParentRef>
    sectionByNodeId: Map<string, string>
    zoneByNodeId: Map<string, string>
    zonesById: Map<string, CoreRuntimeZoneNode>
  }
  package: {
    meta: {
      title: string
    }
  }
  packageVersion: number
}

function inlineLabel(inline: CoreRuntimeInlineNode): string {
  if (inline.type === "text") return inline.text
  if (inline.type === "field-ref") return inline.label ?? inline.fallback ?? `{${inline.key}}`
  if (inline.type === "page-number") return "#"
  return " "
}

function humanizeId(id: string): string {
  return id
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function labelForCoreNode(node: CoreRuntimeAuthoredNode): string {
  switch (node.type) {
    case "text-block": {
      const label = (node.children ?? []).map(inlineLabel).join("").replace(/\s+/gu, " ").trim()
      return label || humanizeId(node.id)
    }
    case "zone":
      return `${humanizeId(typeof node.role === "string" ? node.role : "unknown")} zone`
    case "columns":
      return "Columns"
    case "column":
      return "Column"
    case "table":
      return "Table"
    case "table-row":
      return "Table row"
    case "table-cell":
      return "Table cell"
    case "toc":
      return typeof node.props?.title === "string" ? node.props.title : "Table of contents"
    case "page-break":
      return "Page break"
    case "divider":
      return "Divider"
    case "spacer":
      return "Spacer"
    default:
      return humanizeId(node.id)
  }
}

function parentIdFromRef(ref: CoreRuntimeParentRef | undefined, fallback: string | null): string | null {
  if (!ref) return fallback

  switch (ref.kind) {
    case "section":
      return ref.sectionId
    case "zone":
      return ref.zoneId
    case "columns":
      return ref.columnsId
    case "column":
      return ref.columnId
    case "table":
      return ref.tableId
    case "table-row":
      return ref.rowId
    case "table-cell":
      return ref.cellId
  }
}

export function createCoreRuntimeEditorSeed(session: CoreRuntimeSessionForSeed): CoreEditorSeed {
  const sections = session.document.document.sections.map((section) => ({
    id: section.id,
    label: humanizeId(section.id),
  }))
  const zones = [...session.graph.zonesById.values()].map((zone) => ({
    id: zone.id,
    label: `${humanizeId(zone.role)} zone`,
    sectionId: session.graph.sectionByNodeId.get(zone.id) ?? sections[0]?.id ?? "section-unknown",
  }))
  const sectionNodes: CoreEditorNodeSummary[] = session.document.document.sections.map((section) => ({
    childIds: [...section.zoneIds],
    id: section.id,
    label: humanizeId(section.id),
    parentId: "root",
    sectionId: section.id,
    type: "section",
    zoneId: null,
  }))
  const authoredNodes: CoreEditorNodeSummary[] = [...session.graph.nodesById.values()].map((node) => ({
    childIds: [...(session.graph.childrenByNodeId.get(node.id) ?? [])],
    id: node.id,
    label: labelForCoreNode(node),
    parentId: parentIdFromRef(
      session.graph.parentByNodeId.get(node.id),
      session.graph.sectionByNodeId.get(node.id) ?? null,
    ),
    sectionId: session.graph.sectionByNodeId.get(node.id) ?? null,
    type: node.type,
    zoneId: session.graph.zoneByNodeId.get(node.id) ?? null,
  }))

  return {
    diagnostics: {
      artifactStatus: "not-run",
      exactLayoutStatus: "not-run",
      generationStatus: "not-run",
      graphIssueCount: session.diagnostics.graphIssueCount,
      keyDataStatus: "ready",
    },
    document: {
      documentVersion: session.documentVersion,
      id: session.document.document.id,
      packageVersion: session.packageVersion,
      title: session.package.meta.title,
    },
    nodes: [
      {
        childIds: sections.map((section) => section.id),
        id: "root",
        label: session.package.meta.title,
        parentId: null,
        sectionId: null,
        type: "document",
        zoneId: null,
      },
      ...sectionNodes,
      ...authoredNodes,
    ],
    sections,
    zones,
  }
}
