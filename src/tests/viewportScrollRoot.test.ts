import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { createInitialEditorState, recordViewportScrollRootFacts } from "../editor/runtime/editorState"
import { applyViewportAction } from "../editor/viewport/viewportActions"
import {
  createViewportScrollRootFacts,
  getVisiblePageIdsFromViewportBoxes,
} from "../editor/viewport/viewportMeasurement"
import { createViewportState } from "../editor/viewport/viewportState"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

describe("viewport scroll root binding", () => {
  it("normalizes scroll-root facts and resolves visible page ids", () => {
    const facts = createViewportScrollRootFacts({
      contentHeight: 2400.4,
      contentWidth: 900.2,
      pageBoxes: [
        { bottom: -10, id: "preview-page-before", top: -200 },
        { bottom: 450, id: "preview-page-1", top: -80 },
        { bottom: 980, id: "preview-page-2", top: 455 },
        { bottom: 1400, id: "preview-page-after", top: 980 },
      ],
      scrollLeft: -12,
      scrollTop: 719.6,
      viewportHeight: 720,
      viewportWidth: 1280,
    })

    expect(facts).toEqual({
      contentHeight: 2400,
      contentWidth: 900,
      scrollLeft: 0,
      scrollTop: 720,
      viewportHeight: 720,
      viewportWidth: 1280,
      visiblePageIds: ["preview-page-1", "preview-page-2"],
    })
    expect(getVisiblePageIdsFromViewportBoxes([
      { bottom: 1, id: "top-edge", top: -20 },
      { bottom: 760, id: "bottom-edge", top: 719 },
      { bottom: 900, id: "below", top: 720 },
    ], 720)).toEqual(["top-edge", "bottom-edge"])
  })

  it("records scroll-root facts in viewport state without a DOM write-back contract", () => {
    const viewport = createViewportState()
    const synced = applyViewportAction(viewport, {
      contentHeight: 2911,
      contentWidth: 675,
      kind: "viewport.scrollRootSynced",
      scrollLeft: 0,
      scrollTop: 1200,
      viewportHeight: 567,
      viewportWidth: 680,
      visiblePageIds: ["preview-page-2"],
    })

    expect(synced).toMatchObject({
      contentHeight: 2911,
      contentWidth: 675,
      scrollLeft: 0,
      scrollTop: 1200,
      viewportHeight: 567,
      viewportWidth: 680,
      visiblePageIds: ["preview-page-2"],
    })
    expect(synced.revision).toBe(viewport.revision + 1)
  })

  it("keeps runtime state stable when repeated scroll-root facts are unchanged", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const facts = createViewportScrollRootFacts({
      contentHeight: 2911,
      contentWidth: 675,
      pageBoxes: [{ bottom: 955, id: "preview-page-1", top: 0 }],
      scrollLeft: 0,
      scrollTop: 0,
      viewportHeight: 567,
      viewportWidth: 680,
    })
    const measured = recordViewportScrollRootFacts(state, facts)
    const repeated = recordViewportScrollRootFacts(measured, facts)

    expect(measured).not.toBe(state)
    expect(measured.viewport).toMatchObject({
      contentHeight: 2911,
      contentWidth: 675,
      scrollTop: 0,
      viewportHeight: 567,
      viewportWidth: 680,
      visiblePageIds: ["preview-page-1"],
    })
    expect(repeated).toBe(measured)
    expect(repeated.history).toBe(state.history)
  })

  it("keeps CanvasScrollRoot as a read-only scroll facts boundary", () => {
    const source = readFileSync(
      join(projectRoot, "src", "components", "canvas", "CanvasScrollRoot.tsx"),
      "utf8",
    )

    expect(source).toContain("onScroll={scheduleSettledScrollFacts}")
    expect(source).toContain("createViewportScrollRootFacts")
    expect(source).not.toContain(".scrollTop =")
    expect(source).not.toContain(".scrollLeft =")
    expect(source).not.toContain("scrollTo(")
    expect(source).not.toContain("scrollIntoView")
  })
})
