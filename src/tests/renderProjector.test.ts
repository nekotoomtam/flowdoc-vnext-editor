import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { projectPreviewPages, projectRenderDocument, projectRenderNodes } from "../editor/render/renderProjector"
import { createEditorView } from "../editor/runtime/editorView"

describe("render projector", () => {
  it("projects render nodes without structural document containers", () => {
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
})
