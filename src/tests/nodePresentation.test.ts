import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { projectRenderNodes } from "../editor/render/renderProjector"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import {
  getInspectorFacts,
  getOutlineItems,
  resolveEditorSelectionTarget,
} from "../editor/runtime/editorView"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

function createCoreFixtureState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    baseRevision: 3,
    createdAt: 100,
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    fixtureSource: "core-product-report-minimal",
  }))
}

describe("node presentation projection", () => {
  it("projects the core fixture into user-facing canvas surfaces", () => {
    const state = createCoreFixtureState()
    const view = state.view

    expect(view.presentation.canvasSurfaceNodeIds).toEqual([
      "title",
      "summary-columns",
      "detail-table",
    ])
    expect(projectRenderNodes(view).map((node) => node.id)).toEqual(
      view.presentation.canvasSurfaceNodeIds,
    )
    expect(projectRenderNodes(view).map((node) => [node.id, node.renderKind])).toEqual([
      ["title", "heading"],
      ["summary-columns", "columns"],
      ["detail-table", "table"],
    ])
    expect(getOutlineItems(view).map((item) => [item.id, item.type])).toEqual([
      ["title", "text-block"],
      ["summary-columns", "columns"],
      ["detail-table", "table"],
    ])
    expect(projectRenderNodes(view).map((node) => node.id)).not.toContain("summary-left")
    expect(projectRenderNodes(view).map((node) => node.id)).not.toContain("detail-cell-b-text")
  })

  it("keeps internal structure represented by the owning product surface", () => {
    const state = createCoreFixtureState()
    const view = state.view

    expect(resolveEditorSelectionTarget(view, "summary-left-text")).toBe("summary-columns")
    expect(resolveEditorSelectionTarget(view, "detail-cell-b-text")).toBe("detail-table")
    expect(view.presentation.presentationNodeById["summary-left"]).toMatchObject({
      operationSurface: "columns",
      representedBySurfaceId: "summary-columns",
      role: "internal",
      selectionTargetId: "summary-columns",
    })
    expect(view.presentation.presentationNodeById["detail-cell-b-text"]).toMatchObject({
      nearest: {
        tableCellId: "detail-cell-b",
        tableId: "detail-table",
      },
      operationSurface: "text-block",
      representedBySurfaceId: "detail-table",
      textRole: "label",
    })
    expect(view.presentation.representedNodeIdsBySurfaceId["detail-table"]).toEqual([
      "detail-table",
      "detail-header-row",
      "detail-cell-a",
      "detail-cell-a-text",
      "detail-cell-b",
      "detail-cell-b-text",
    ])
    expect(getInspectorFacts(view, "detail-cell-b-text")).toMatchObject({
      canBeDeleted: true,
      id: "detail-table",
      operationSurface: "table",
      type: "table",
    })
  })

  it("resolves selection commands from internal nodes to product surfaces", () => {
    const state = createCoreFixtureState()
    const selected = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "canvas-hit-test",
      source: "canvas",
      target: {
        nodeId: "detail-cell-b-text",
      },
    }).state

    expect(selected.selection.selectedNodeId).toBe("detail-table")
    expect(selected.selection.selectionReason).toBe("canvas-hit-test")
    expect(selected.history.records[0]).toMatchObject({
      payloadSummary: "detail-table",
      targetNodeIds: ["detail-table"],
    })
  })
})
