import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { createInitialEditorStateFromWorkingSet, recordViewportScrollRootFacts } from "../editor/runtime/editorState"
import { getInspectorFacts, getOutlineItems } from "../editor/runtime/editorView"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"
import { hitTestNodeBoundsAtPoint } from "../editor/selection/hitTest"
import { createViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

function readSource(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8")
}

function createRuntimeState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    createdAt: 100,
  }))
}

describe("selection hit-test boundary", () => {
  it("resolves the topmost node bounds at a viewport point", () => {
    expect(hitTestNodeBoundsAtPoint({
      nodeBounds: [
        { bottom: 180, left: 20, nodeId: "report-title", right: 420, top: 80 },
        { bottom: 220, left: 40, nodeId: "revenue-table", right: 460, top: 120 },
      ],
      x: 120,
      y: 150,
    })).toEqual({
      nodeId: "revenue-table",
      x: 120,
      y: 150,
    })

    expect(hitTestNodeBoundsAtPoint({
      nodeBounds: [
        { bottom: 100, left: 0, nodeId: "before-scroll", right: 200, top: 0 },
        { bottom: 420, left: 0, nodeId: "visible-after-scroll", right: 200, top: 300 },
      ],
      x: 80,
      y: 320,
    }).nodeId).toBe("visible-after-scroll")

    expect(hitTestNodeBoundsAtPoint({
      nodeBounds: [{ bottom: 50, left: 0, nodeId: "miss", right: 50, top: 0 }],
      x: 80,
      y: 80,
    })).toEqual({
      nodeId: null,
      x: 80,
      y: 80,
    })
  })

  it("keeps selected node alignment across canvas, outline, inspector, and status after scroll and zoom", () => {
    const state = createRuntimeState()
    const selected = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "canvas-hit-test",
      source: "canvas",
      target: {
        nodeId: "adoption-table",
      },
    }).state
    const scrolled = recordViewportScrollRootFacts(selected, createViewportScrollRootFacts({
      contentHeight: 2911,
      contentWidth: 675,
      pageBoxes: [{ bottom: 1800, id: "preview-page-2", top: 900 }],
      scrollLeft: 0,
      scrollTop: 960,
      viewportHeight: 720,
      viewportWidth: 900,
    }))
    const zoomed = dispatchEditorRuntimeCommand(scrolled, {
      kind: "viewport.setZoom",
      payload: {
        zoom: 1.1,
      },
      source: "toolbar",
    }).state
    const selectedNodeId = zoomed.selection.selectedNodeId
    const outlineItem = getOutlineItems(zoomed.view).find((item) => item.id === selectedNodeId)
    const inspectorFacts = getInspectorFacts(zoomed.view, selectedNodeId)
    const statusSource = readSource("src", "components", "shell", "StatusBar.tsx")

    expect(selectedNodeId).toBe("adoption-table")
    expect(outlineItem).toMatchObject({
      id: "adoption-table",
      type: "table",
    })
    expect(inspectorFacts).toMatchObject({
      id: "adoption-table",
      type: "table",
    })
    expect(statusSource).toContain("Selected: {selection.selectedNodeId ?? \"none\"}")
  })

  it("keeps canvas selection clicks behind the hit-test boundary and overlay pointer policy", () => {
    const pageStackSource = readSource("src", "components", "paper", "PaperPageStack.tsx")
    const blockSource = readSource("src", "components", "paper", "PaperBlock.tsx")
    const overlaySource = readSource("src", "components", "canvas", "CanvasOverlayLayer.tsx")
    const editorCss = readSource("src", "styles", "editor.css")

    expect(pageStackSource).toContain("hitTestCanvasNodeTarget")
    expect(pageStackSource).toContain("onClick={handleCanvasClick}")
    expect(blockSource).not.toContain("onClick")
    expect(overlaySource).toContain("aria-hidden=\"true\"")
    expect(editorCss).toContain(".canvas-overlay-layer")
    expect(editorCss).toContain("pointer-events: none")
  })
})
