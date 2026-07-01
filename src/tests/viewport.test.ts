import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { createDefaultPaperModel } from "../editor/paper/paperModel"
import { createInitialEditorState, selectPaperPreset, selectPaperZoom } from "../editor/runtime/editorState"
import { applyViewportAction } from "../editor/viewport/viewportActions"
import { createViewportMeasurement } from "../editor/viewport/viewportMeasurement"
import {
  getViewportAnchor,
  getViewportScrollPosition,
  getViewportZoom,
  getViewportZoomPercent,
  hasPendingViewportAnchor,
} from "../editor/viewport/viewportSelectors"
import { createViewportState } from "../editor/viewport/viewportState"
import { clampViewportZoom, VIEWPORT_ZOOM_DEFAULT } from "../editor/viewport/zoomPolicy"

describe("viewport foundation", () => {
  it("owns zoom policy and clamps zoom through viewport actions", () => {
    const viewport = createViewportState()
    const zoomedIn = applyViewportAction(viewport, {
      kind: "viewport.setZoom",
      zoom: 4,
    })
    const zoomedOut = applyViewportAction(zoomedIn, {
      kind: "viewport.setZoom",
      zoom: 0.1,
    })

    expect(getViewportZoom(viewport)).toBe(VIEWPORT_ZOOM_DEFAULT)
    expect(getViewportZoom(zoomedIn)).toBe(1.25)
    expect(getViewportZoomPercent(zoomedIn)).toBe(125)
    expect(getViewportZoom(zoomedOut)).toBe(0.5)
    expect(clampViewportZoom(0.875)).toBe(0.88)
  })

  it("tracks measurements and scroll position without writing DOM scroll", () => {
    const measured = applyViewportAction(createViewportState(), {
      contentHeight: 4000,
      contentWidth: 1200,
      kind: "viewport.measured",
      viewportHeight: 720,
      viewportWidth: 1280,
    })
    const scrolled = applyViewportAction(measured, {
      kind: "viewport.scrolled",
      scrollLeft: -20,
      scrollTop: 520,
      visiblePageIds: ["preview-page-2"],
    })

    expect(createViewportMeasurement(scrolled)).toMatchObject({
      contentHeight: 4000,
      contentWidth: 1200,
      scrollLeft: 0,
      scrollTop: 520,
      viewportHeight: 720,
      viewportWidth: 1280,
    })
    expect(getViewportScrollPosition(scrolled)).toEqual({
      scrollLeft: 0,
      scrollTop: 520,
    })
    expect(scrolled.visiblePageIds).toEqual(["preview-page-2"])
  })

  it("creates and clears pending anchors explicitly", () => {
    const jumped = applyViewportAction(createViewportState(), {
      align: "center",
      kind: "viewport.jumpToNode",
      nodeId: "report-title",
      reason: "outline-click",
    })
    const anchor = getViewportAnchor(jumped)

    expect(anchor).toMatchObject({
      align: "center",
      kind: "node",
      reason: "outline-click",
      targetId: "report-title",
    })
    expect(hasPendingViewportAnchor(jumped)).toBe(true)
    expect(applyViewportAction(jumped, { anchorId: "stale", kind: "viewport.anchorApplied" })).toBe(jumped)
    expect(hasPendingViewportAnchor(applyViewportAction(jumped, {
      anchorId: anchor?.id ?? "",
      kind: "viewport.anchorApplied",
    }))).toBe(false)
  })

  it("bridges viewport zoom into the current paper model during the transition", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const paper = createDefaultPaperModel()
    const zoomed = selectPaperZoom(state, 1.1)
    const letter = selectPaperPreset(zoomed, "Letter")

    expect(state.viewport.zoom).toBe(paper.zoom)
    expect(zoomed.viewport.zoom).toBe(1.1)
    expect(zoomed.paper.zoom).toBe(1.1)
    expect(letter.paper.preset).toBe("Letter")
    expect(letter.paper.zoom).toBe(zoomed.viewport.zoom)
  })
})
