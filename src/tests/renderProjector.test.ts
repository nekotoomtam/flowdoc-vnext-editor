import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID, loadInitialEditorSeed } from "../core/coreAdapter"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { createPaperModel } from "../editor/paper/paperModel"
import { projectPreviewPages, projectRenderDocument, projectRenderNodes } from "../editor/render/renderProjector"
import { createEditorView } from "../editor/runtime/editorView"

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
  })
})
