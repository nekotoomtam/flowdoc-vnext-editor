import { describe, expect, it } from "vitest"
import type { CoreEditorNodeSummary, CoreEditorSeed } from "../core/coreTypes"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID, loadInitialEditorSeed } from "../core/coreAdapter"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { createPaperModel } from "../editor/paper/paperModel"
import { projectPreviewPages, projectRenderDocument, projectRenderNodes } from "../editor/render/renderProjector"
import { createEditorView } from "../editor/runtime/editorView"

function insertManualPageBreak(seed: CoreEditorSeed): CoreEditorSeed {
  const manualBreak: CoreEditorNodeSummary = {
    capabilities: {
      canBeDeleted: true,
      canBeDuplicated: false,
      canBeReordered: true,
      canContainText: false,
      canSplitAcrossPages: false,
    },
    childIds: [],
    id: "manual-page-break",
    label: "Manual page break",
    operationSurface: "utility",
    parentId: "zone-main",
    sectionId: "section-1",
    type: "page-break",
    zoneId: "zone-main",
  }

  return {
    ...seed,
    nodes: [
      ...seed.nodes.map((node) => (
        node.id === "zone-main"
          ? {
              ...node,
              childIds: [...node.childIds, manualBreak.id],
            }
          : node
      )),
      manualBreak,
    ],
  }
}

function insertOversizedColumns(seed: CoreEditorSeed): CoreEditorSeed {
  const columnTextNodes: CoreEditorNodeSummary[] = Array.from({ length: 9 }, (_, index) => ({
    capabilities: {
      canBeDeleted: true,
      canBeDuplicated: true,
      canBeReordered: true,
      canContainText: true,
      canSplitAcrossPages: true,
    },
    childIds: [],
    id: `oversized-column-text-${index + 1}`,
    label: `Oversized column text ${index + 1}`,
    operationSurface: "text-block",
    parentId: "oversized-column",
    sectionId: "section-1",
    textRole: "paragraph",
    type: "text-block",
    zoneId: "zone-main",
  }))
  const columnNode: CoreEditorNodeSummary = {
    capabilities: {
      canBeDeleted: true,
      canBeDuplicated: true,
      canBeReordered: false,
      canContainText: false,
      canSplitAcrossPages: false,
    },
    childIds: columnTextNodes.map((node) => node.id),
    id: "oversized-column",
    label: "Oversized column",
    parentId: "oversized-columns",
    sectionId: "section-1",
    type: "column",
    zoneId: "zone-main",
  }
  const columnsNode: CoreEditorNodeSummary = {
    capabilities: {
      canBeDeleted: true,
      canBeDuplicated: true,
      canBeReordered: true,
      canContainText: false,
      canSplitAcrossPages: false,
    },
    childIds: [columnNode.id],
    id: "oversized-columns",
    label: "Oversized columns",
    operationSurface: "columns",
    parentId: "zone-main",
    sectionId: "section-1",
    type: "columns",
    zoneId: "zone-main",
  }

  return {
    ...seed,
    nodes: [
      ...seed.nodes.map((node) => (
        node.id === "zone-main"
          ? {
              ...node,
              childIds: [...node.childIds, columnsNode.id],
            }
          : node
      )),
      columnsNode,
      columnNode,
      ...columnTextNodes,
    ],
  }
}

describe("render projector", () => {
  it("projects render nodes from product-facing presentation surfaces", () => {
    const view = createEditorView(loadInitialEditorSeed())
    const nodes = projectRenderNodes(view)

    expect(nodes).toHaveLength(view.renderableNodeIds.length)
    expect(nodes.map((node) => node.id)).toEqual(view.renderableNodeIds)
    expect(nodes.map((node) => node.type)).not.toContain("document")
    expect(nodes.map((node) => node.type)).not.toContain("section")
    expect(nodes.map((node) => node.type)).not.toContain("zone")
  })

  it("groups stress fixture render nodes into stable preview pages", () => {
    const view = createEditorView(loadInitialEditorSeed())
    const projection = projectRenderDocument(view)
    const projectedNodeIds = projection.pages.flatMap((page) => page.nodeIds)

    expect(projection.pages.length).toBeGreaterThan(1)
    expect(projection.revision).toBe(view.nodeOrder.length)
    expect(projectedNodeIds).toEqual(view.renderableNodeIds)
    expect(projection.pages.map((page) => page.pageNumber)).toEqual(
      projection.pages.map((_, index) => index + 1),
    )
  })

  it("keeps minimal product surfaces on one A4 page when estimated block heights fit", () => {
    const workingSet = loadInitialCoreWorkingSet({
      baseRevision: 3,
      createdAt: 100,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })
    const projection = projectRenderDocument(workingSet.readModel, {
      paper: createPaperModel("A4"),
    })
    const firstPage = projection.pages[0]

    expect(projection.pages).toHaveLength(1)
    expect(firstPage.nodeIds).toEqual(["title", "summary-columns", "detail-table"])
    expect(firstPage.estimatedContentHeightPx).toBeLessThan(firstPage.flowCapacityPx)
  })

  it("splits preview pages only when estimated content exceeds flow capacity", () => {
    const workingSet = loadInitialCoreWorkingSet({
      baseRevision: 3,
      createdAt: 100,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })
    const projection = projectRenderDocument(workingSet.readModel, {
      flowCapacityPx: 220,
    })

    expect(projection.pages.map((page) => page.nodeIds)).toEqual([
      ["title"],
      ["summary-columns"],
      ["detail-table"],
    ])
    expect(projection.pages.every((page) => page.overflowStatus === "fits")).toBe(true)
    expect(projection.pages.every((page) => page.estimatedContentHeightPx <= page.flowCapacityPx)).toBe(true)
  })

  it("estimates manual page breaks from the active preview flow capacity", () => {
    const view = createEditorView(insertManualPageBreak(loadInitialEditorSeed()))
    const smallCapacityNodes = projectRenderNodes(view, {
      flowCapacityPx: 333,
    })
    const letterProjection = projectRenderDocument(view, {
      paper: createPaperModel("Letter"),
    })
    const smallCapacityBreak = smallCapacityNodes.find((node) => node.id === "manual-page-break")
    const letterBreak = letterProjection.pages
      .flatMap((page) => page.nodes)
      .find((node) => node.id === "manual-page-break")

    expect(smallCapacityBreak).toMatchObject({
      estimatedHeightPx: 333,
      renderKind: "page-break",
    })
    expect(letterBreak).toMatchObject({
      estimatedHeightPx: 840,
      renderKind: "page-break",
    })
    expect(letterProjection.pages.every((page) => page.flowCapacityPx === 840)).toBe(true)
  })

  it("marks only single oversized render nodes as preview overflow", () => {
    const view = createEditorView(insertOversizedColumns(loadInitialEditorSeed()))
    const projection = projectRenderDocument(view, {
      flowCapacityPx: 220,
    })
    const overflowPage = projection.pages.find((page) => (
      page.nodeIds.includes("oversized-columns")
    ))

    expect(projection.pages.some((page) => page.overflowStatus === "multi-node-overflow")).toBe(false)
    expect(overflowPage).toMatchObject({
      flowCapacityPx: 220,
      nodeIds: ["oversized-columns"],
      overflowStatus: "single-node-overflow",
    })
    expect(overflowPage?.estimatedContentHeightPx).toBeGreaterThan(220)
  })
})
