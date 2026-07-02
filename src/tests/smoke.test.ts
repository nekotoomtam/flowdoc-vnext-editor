import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { createPaperModel, setPaperPreset, setPaperZoom } from "../editor/paper/paperModel"
import { projectPreviewPages, projectRenderNodes } from "../editor/render/renderProjector"
import {
  createEditorView,
  getInspectorFacts,
  getNodeById,
  getOutlineItems,
} from "../editor/runtime/editorView"

describe("product editor scaffold smoke", () => {
  it("builds a normalized editor view from the placeholder core adapter seed", () => {
    const seed = loadInitialEditorSeed()
    const view = createEditorView(seed)
    const renderableNodes = projectRenderNodes(view)
    const previewPages = projectPreviewPages(view)

    expect(getNodeById(view, "root")?.label).toBe("Document")
    expect(view.nodeOrder.slice(0, 4)).toEqual(["root", "section-1", "zone-main", "report-title"])
    expect(view.nodeOrder).toContain("next-steps")
    expect(view.textBlockIds).toContain("report-title")
    expect(view.textBlockIds).toContain("qa-scroll")
    expect(view.tableIds).toEqual(["revenue-table", "adoption-table", "operations-table"])
    expect(view.renderableNodeIds).toHaveLength(20)
    expect(getOutlineItems(view).map((item) => item.id)).toEqual(view.renderableNodeIds)
    expect(renderableNodes.map((node) => node.id)).toEqual(view.renderableNodeIds)
    expect(previewPages.length).toBeGreaterThan(1)
    expect(previewPages.flatMap((page) => page.nodeIds)).toEqual(view.renderableNodeIds)
    expect(previewPages.map((page) => page.pageNumber)).toEqual(
      previewPages.map((_, index) => index + 1),
    )
    expect(getInspectorFacts(view, "report-title")).toMatchObject({
      id: "report-title",
      parentId: "zone-main",
      type: "heading",
    })
  })

  it("keeps paper model presets and zoom bounded for the canvas", () => {
    const a4 = createPaperModel("A4")
    const letter = setPaperPreset(a4, "Letter")
    const zoomed = setPaperZoom(letter, 4)

    expect(a4.widthPx).toBe(794)
    expect(letter.widthPx).toBe(816)
    expect(letter.zoom).toBe(a4.zoom)
    expect(zoomed.zoom).toBe(1.25)
  })
})
