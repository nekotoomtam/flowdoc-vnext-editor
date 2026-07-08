import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import { createSiblingReorderPlacementPlan } from "../editor/commands/reorderPlacement"
import { getCanvasReorderAutoScrollDelta } from "../editor/interaction/canvasReorderAutoScroll"
import { getCanvasKeyboardReorderAction } from "../editor/interaction/canvasReorderKeyboard"
import {
  commitCanvasReorderDragSession,
  finishCanvasReorderDragSession,
  getActiveCanvasReorderInsertionSlot,
  getActiveCanvasReorderPreviewSiblingIds,
  getCanvasReorderBlockState,
  getReadyCanvasReorderPlan,
  startCanvasReorderDragSession,
  updateCanvasReorderDragSession,
} from "../editor/interaction/canvasReorderDragSession"
import {
  getCanvasReorderEdgePlacementFromBounds,
  getCanvasReorderFlowPlacementFromBounds,
  getCanvasReorderPlacementFromBounds,
  normalizeCanvasReorderPlacement,
} from "../editor/interaction/canvasReorderHitTest"
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

  it("derives edge placements from open space above the first block and below the last block", () => {
    const firstBounds = {
      bottom: 180,
      top: 100,
    }
    const lastBounds = {
      bottom: 420,
      top: 320,
    }

    expect(getCanvasReorderEdgePlacementFromBounds(firstBounds, lastBounds, 80)).toBe("before")
    expect(getCanvasReorderEdgePlacementFromBounds(firstBounds, lastBounds, 460)).toBe("after")
    expect(getCanvasReorderEdgePlacementFromBounds(firstBounds, lastBounds, 220)).toBeNull()
    expect(getCanvasReorderEdgePlacementFromBounds(null, lastBounds, 460)).toBeNull()
  })

  it("derives insertion placements from open flow gaps between blocks", () => {
    const nodeBounds = [
      {
        bottom: 160,
        nodeId: "title",
        top: 100,
      },
      {
        bottom: 280,
        nodeId: "detail-table",
        top: 200,
      },
      {
        bottom: 460,
        nodeId: "summary-columns",
        top: 320,
      },
    ]

    expect(getCanvasReorderFlowPlacementFromBounds(nodeBounds, 80)).toEqual({
      nodeId: "title",
      placement: "before",
    })
    expect(getCanvasReorderFlowPlacementFromBounds(nodeBounds, 170)).toEqual({
      nodeId: "title",
      placement: "after",
    })
    expect(getCanvasReorderFlowPlacementFromBounds(nodeBounds, 190)).toEqual({
      nodeId: "detail-table",
      placement: "before",
    })
    expect(getCanvasReorderFlowPlacementFromBounds(nodeBounds, 500)).toEqual({
      nodeId: "summary-columns",
      placement: "after",
    })
    expect(getCanvasReorderFlowPlacementFromBounds(nodeBounds, 240)).toBeNull()
  })

  it("accepts only explicit reorder slot placements for slot hit testing", () => {
    expect(normalizeCanvasReorderPlacement("before")).toBe("before")
    expect(normalizeCanvasReorderPlacement("after")).toBe("after")
    expect(normalizeCanvasReorderPlacement("inside")).toBeNull()
    expect(normalizeCanvasReorderPlacement(undefined)).toBeNull()
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

  it("maps command-modified arrow keys to keyboard reorder directions", () => {
    expect(getCanvasKeyboardReorderAction({
      altKey: false,
      ctrlKey: true,
      key: "ArrowUp",
      metaKey: false,
      shiftKey: false,
    })).toEqual({
      direction: "up",
    })
    expect(getCanvasKeyboardReorderAction({
      altKey: false,
      ctrlKey: false,
      key: "ArrowDown",
      metaKey: true,
      shiftKey: false,
    })).toEqual({
      direction: "down",
    })
    expect(getCanvasKeyboardReorderAction({
      altKey: false,
      ctrlKey: false,
      key: "ArrowDown",
      metaKey: false,
      shiftKey: false,
    })).toBeNull()
    expect(getCanvasKeyboardReorderAction({
      altKey: false,
      ctrlKey: true,
      key: "ArrowDown",
      metaKey: false,
      shiftKey: true,
    })).toBeNull()
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
      slot: {
        afterNodeId: "detail-table",
        beforeNodeId: null,
        containerId: "zone-cover-body",
        insertIndex: 2,
        scope: "body-flow",
      },
      status: "ready",
      targetNodeId: "detail-table",
      toIndex: 2,
    })
    expect(getActiveCanvasReorderInsertionSlot(updated)).toEqual({
      afterNodeId: "detail-table",
      beforeNodeId: null,
      containerId: "zone-cover-body",
      insertIndex: 2,
      scope: "body-flow",
    })
    expect(getActiveCanvasReorderPreviewSiblingIds(updated)).toEqual([
      "title",
      "detail-table",
      "summary-columns",
    ])
    expect(finishCanvasReorderDragSession()).toEqual({
      status: "idle",
    })
  })

  it("keeps the ready preview order available while a drop commit is pending", () => {
    const state = createCoreFixtureState()
    const plan = createSiblingReorderPlacementPlan(state, {
      nodeId: "summary-left-text",
      placement: "after",
      targetNodeId: "detail-cell-b-text",
    })
    const updated = updateCanvasReorderDragSession(
      startCanvasReorderDragSession("summary-columns", { x: 20, y: 40 }),
      plan,
      { x: 40, y: 220 },
    )
    const committing = commitCanvasReorderDragSession(updated)

    expect(committing.status).toBe("committing")
    expect(getActiveCanvasReorderPreviewSiblingIds(committing)).toEqual([
      "title",
      "detail-table",
      "summary-columns",
    ])
    expect(getCanvasReorderBlockState({
      dragState: committing,
      isDraggable: true,
      nodeId: "summary-columns",
    })).toMatchObject({
      isDragging: false,
      targetState: "idle",
    })
  })

  it("collapses adjacent before and after target hits into the same insertion slot", () => {
    const state = createCoreFixtureState()
    const afterTitlePlan = createSiblingReorderPlacementPlan(state, {
      nodeId: "detail-table",
      placement: "after",
      targetNodeId: "title",
    })
    const beforeColumnsPlan = createSiblingReorderPlacementPlan(state, {
      nodeId: "detail-table",
      placement: "before",
      targetNodeId: "summary-columns",
    })

    expect(afterTitlePlan.status).toBe("ready")
    expect(beforeColumnsPlan.status).toBe("ready")
    if (afterTitlePlan.status !== "ready" || beforeColumnsPlan.status !== "ready") return

    expect(afterTitlePlan.slot).toEqual({
      afterNodeId: "title",
      beforeNodeId: "summary-columns",
      containerId: "zone-cover-body",
      insertIndex: 1,
      scope: "body-flow",
    })
    expect(beforeColumnsPlan.slot).toEqual(afterTitlePlan.slot)
    expect(beforeColumnsPlan.toIndex).toBe(afterTitlePlan.toIndex)
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
    const blockedStateFixture = {
      ...state,
      view: {
        ...state.view,
        childrenById: {
          ...state.view.childrenById,
          "other-parent": ["detail-table"],
          "zone-cover-body": ["title", "summary-columns"],
        },
        parentById: {
          ...state.view.parentById,
          "detail-table": "other-parent",
        },
      },
    }
    const blockedPlan = createSiblingReorderPlacementPlan(blockedStateFixture, {
      nodeId: "summary-left-text",
      placement: "after",
      targetNodeId: "detail-cell-b-text",
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
    const blockedState = updateCanvasReorderDragSession(
      startCanvasReorderDragSession("summary-columns", { x: 20, y: 40 }),
      blockedPlan,
      { x: 40, y: 220 },
    )

    expect(getCanvasReorderBlockState({
      dragState: readyState,
      isDraggable: true,
      nodeId: "detail-table",
    })).toMatchObject({
      isBlockedTarget: false,
      isNoopTarget: false,
      placement: null,
      reason: null,
      targetState: "idle",
    })
    expect(getCanvasReorderBlockState({
      dragState: noopState,
      isDraggable: true,
      nodeId: "summary-columns",
    })).toMatchObject({
      isNoopTarget: true,
      placement: null,
      reason: "Cannot drop a node onto itself.",
      targetState: "noop",
    })
    expect(getCanvasReorderBlockState({
      dragState: blockedState,
      isDraggable: true,
      nodeId: "detail-table",
    })).toMatchObject({
      isBlockedTarget: true,
      placement: null,
      reason: "Drag/drop reorder is limited to siblings in the same parent.",
      targetState: "blocked",
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

  it("styles the dragged canvas block as an empty placeholder", () => {
    const editorCss = readSource("src", "styles", "editor.css")

    expect(editorCss).toContain(".paper-block[data-reorder-dragging=\"true\"]")
    expect(editorCss).toContain("pointer-events: none")
    expect(editorCss).toContain(".paper-block[data-reorder-dragging=\"true\"] > *")
    expect(editorCss).toContain("opacity: 0")
    expect(editorCss).toContain("visibility: hidden")
  })

  it("keeps pointer drag wiring in canvas components and commit behavior in app/runtime modules", () => {
    const appSource = readSource("src", "app", "EditorApp.tsx")
    const shellSource = readSource("src", "app", "EditorShell.tsx")
    const stageSource = readSource("src", "components", "canvas", "CanvasStage.tsx")
    const hookSource = readSource("src", "app", "useCanvasReorderDrag.ts")
    const pageStackSource = readSource("src", "components", "paper", "PaperPageStack.tsx")
    const pageSource = readSource("src", "components", "paper", "PaperPage.tsx")
    const blockSource = readSource("src", "components", "paper", "PaperBlock.tsx")
    const hitTestSource = readSource("src", "editor", "interaction", "canvasReorderHitTest.ts")

    expect(appSource).toContain("useCanvasReorderDrag")
    expect(appSource).toContain("mutationStatus")
    expect(appSource).toContain("getCanvasKeyboardReorderFocusDecision")
    expect(appSource).toContain("pendingKeyboardReorderFocusNodeId")
    expect(appSource).toContain("onCanvasFocusHandled={handleCanvasFocusHandled}")
    expect(hookSource).toContain("createSiblingReorderPlacementPlan")
    expect(hookSource).toContain("commitCanvasReorderDragSession")
    expect(hookSource).toContain("mutationStatus.status === \"pending\"")
    expect(hookSource).toContain("targetNodeId === currentState.nodeId")
    expect(hookSource).toContain("targetNodeId === dragState.nodeId")
    expect(hookSource).toContain("getActiveCanvasReorderInsertionSlot")
    expect(hookSource).toContain("getActiveCanvasReorderPreviewSiblingIds")
    expect(hookSource).toContain("getActiveInsertionSlot")
    expect(hookSource).toContain("getActivePreviewSiblingIds")
    expect(hookSource).toContain("onReorderNodeToIndex")
    expect(shellSource).toContain("canvasFocusNodeId={canvasFocusNodeId}")
    expect(shellSource).toContain("onReorderNode(nodeId, direction, \"keyboard\")")
    expect(stageSource).toContain("focusCanvasNodeButton")
    expect(stageSource).toContain("onCanvasFocusHandled(canvasFocusNodeId)")
    expect(pageStackSource).toContain("hitTestCanvasReorderTarget")
    expect(pageStackSource).toContain("scrollCanvasReorderRootAtPointer")
    expect(pageStackSource).toContain("lastReorderHit")
    expect(pageStackSource).toContain("const dropHit = session.lastReorderHit")
    expect(pageStackSource).toContain("onPointerDown={handlePointerDown}")
    expect(pageStackSource).toContain("onPointerUp={handlePointerUp}")
    expect(pageStackSource).toContain("onKeyboardReorderNode={onKeyboardReorderNode}")
    expect(pageSource).toContain("PaperReorderSlot")
    expect(pageSource).toContain("getPreviewOrderedNodes")
    expect(pageSource).toContain("canvasReorderDrag.getActivePreviewSiblingIds()")
    expect(pageSource).toContain("previewNodes.map")
    expect(pageSource).toContain("shouldRenderInsertionSlot")
    expect(pageSource).toContain("getActiveSlotPlacementForNode")
    expect(pageSource).toContain("data-reorder-slot-index={slot.insertIndex}")
    expect(pageSource).toContain("data-reorder-slot-target-id={targetNodeId}")
    expect(pageSource).toContain("slot.beforeNodeId === nodeId")
    expect(pageSource).toContain("slot.beforeNodeId === null && slot.afterNodeId === nodeId")
    expect(hitTestSource).toContain("CANVAS_REORDER_SLOT_SELECTOR")
    expect(hitTestSource).toContain("CANVAS_CONTENT_FLOW_SELECTOR")
    expect(hitTestSource).toContain("getCanvasReorderEdgePlacementFromBounds")
    expect(hitTestSource).toContain("getCanvasReorderFlowPlacementFromBounds")
    expect(hitTestSource).toContain("dataset.reorderSlotTargetId")
    expect(hitTestSource).toContain("normalizeCanvasReorderPlacement")
    expect(blockSource).toContain("getCanvasKeyboardReorderAction")
    expect(blockSource).toContain("aria-keyshortcuts={reorderState.isDraggable")
    expect(blockSource).toContain("onKeyDown={handleKeyDown}")
    expect(blockSource).toContain("data-reorder-draggable={reorderState.isDraggable ? \"true\" : \"false\"}")
    expect(blockSource).toContain("data-reorder-placement={reorderState.placement ?? \"none\"}")
    expect(blockSource).toContain("data-reorder-reason={reorderState.reason ?? \"\"}")
    expect(blockSource).toContain("data-reorder-target={reorderState.targetState}")
    expect(pageStackSource).not.toContain("commitMutation")
    expect(blockSource).not.toContain("commitMutation")
  })
})
