import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import { createSiblingReorderPlacementPlan } from "../editor/commands/reorderPlacement"
import { getCanvasReorderAutoScrollDelta } from "../editor/interaction/canvasReorderAutoScroll"
import {
  finishCanvasReorderDragSession,
  getCanvasReorderBlockState,
  getReadyCanvasReorderPlan,
  startCanvasReorderDragSession,
  updateCanvasReorderDragSession,
} from "../editor/interaction/canvasReorderDragSession"
import { getCanvasReorderPlacementFromBounds } from "../editor/interaction/canvasReorderHitTest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

function readSource(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8")
}

function createCoreFixtureState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    baseRevision: 3,
    createdAt: 100,
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    fixtureSource: "core-product-report-minimal",
  }))
}

describe("canvas reorder drag boundary", () => {
  it("derives before and after placements from the target midpoint", () => {
    const bounds = {
      bottom: 260,
      top: 100,
    }

    expect(getCanvasReorderPlacementFromBounds(bounds, 120)).toBe("before")
    expect(getCanvasReorderPlacementFromBounds(bounds, 180)).toBe("after")
  })

  it("computes canvas auto-scroll pressure near scroll-root edges", () => {
    expect(getCanvasReorderAutoScrollDelta({
      pointerY: 112,
      rootBottom: 700,
      rootTop: 100,
    })).toBeLessThan(0)
    expect(getCanvasReorderAutoScrollDelta({
      pointerY: 688,
      rootBottom: 700,
      rootTop: 100,
    })).toBeGreaterThan(0)
    expect(getCanvasReorderAutoScrollDelta({
      pointerY: 360,
      rootBottom: 700,
      rootTop: 100,
    })).toBe(0)
  })

  it("keeps drag state transient and exposes only a ready placement plan for commit", () => {
    const state = createCoreFixtureState()
    const plan = createSiblingReorderPlacementPlan(state, {
      nodeId: "summary-left-text",
      placement: "after",
      targetNodeId: "detail-cell-b-text",
    })
    const started = startCanvasReorderDragSession("summary-columns", {
      x: 20,
      y: 40,
    })
    const updated = updateCanvasReorderDragSession(started, plan, {
      x: 40,
      y: 220,
    })

    expect(getReadyCanvasReorderPlan(updated)).toMatchObject({
      nodeId: "summary-columns",
      status: "ready",
      targetNodeId: "detail-table",
      toIndex: 2,
    })
    expect(finishCanvasReorderDragSession()).toEqual({
      status: "idle",
    })
  })

  it("derives ready, noop, and idle block affordance states from drag plans", () => {
    const state = createCoreFixtureState()
    const readyPlan = createSiblingReorderPlacementPlan(state, {
      nodeId: "summary-left-text",
      placement: "after",
      targetNodeId: "detail-cell-b-text",
    })
    const noopPlan = createSiblingReorderPlacementPlan(state, {
      nodeId: "summary-left-text",
      placement: "after",
      targetNodeId: "summary-right-text",
    })
    const readyState = updateCanvasReorderDragSession(
      startCanvasReorderDragSession("summary-columns", { x: 20, y: 40 }),
      readyPlan,
      { x: 40, y: 220 },
    )
    const noopState = updateCanvasReorderDragSession(
      startCanvasReorderDragSession("summary-columns", { x: 20, y: 40 }),
      noopPlan,
      { x: 22, y: 42 },
    )

    expect(getCanvasReorderBlockState({
      dragState: readyState,
      isDraggable: true,
      nodeId: "detail-table",
    })).toMatchObject({
      isBlockedTarget: false,
      isNoopTarget: false,
      placement: "after",
      targetState: "ready",
    })
    expect(getCanvasReorderBlockState({
      dragState: noopState,
      isDraggable: true,
      nodeId: "summary-columns",
    })).toMatchObject({
      isNoopTarget: true,
      placement: null,
      targetState: "noop",
    })
    expect(getCanvasReorderBlockState({
      dragState: finishCanvasReorderDragSession(),
      isDraggable: true,
      nodeId: "summary-columns",
    })).toMatchObject({
      isDraggable: true,
      targetState: "idle",
    })
  })

  it("keeps pointer drag wiring in canvas components and commit behavior in app/runtime modules", () => {
    const appSource = readSource("src", "app", "EditorApp.tsx")
    const hookSource = readSource("src", "app", "useCanvasReorderDrag.ts")
    const pageStackSource = readSource("src", "components", "paper", "PaperPageStack.tsx")
    const blockSource = readSource("src", "components", "paper", "PaperBlock.tsx")

    expect(appSource).toContain("useCanvasReorderDrag")
    expect(hookSource).toContain("createSiblingReorderPlacementPlan")
    expect(hookSource).toContain("onReorderNodeToIndex")
    expect(pageStackSource).toContain("hitTestCanvasReorderTarget")
    expect(pageStackSource).toContain("scrollCanvasReorderRootAtPointer")
    expect(pageStackSource).toContain("onPointerDown={handlePointerDown}")
    expect(pageStackSource).toContain("onPointerUp={handlePointerUp}")
    expect(blockSource).toContain("data-reorder-draggable={reorderState.isDraggable ? \"true\" : \"false\"}")
    expect(blockSource).toContain("data-reorder-placement={reorderState.placement ?? \"none\"}")
    expect(blockSource).toContain("data-reorder-target={reorderState.targetState}")
    expect(pageStackSource).not.toContain("commitMutation")
    expect(blockSource).not.toContain("commitMutation")
  })
})
