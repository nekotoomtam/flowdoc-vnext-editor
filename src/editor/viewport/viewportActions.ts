import type { ViewportAction, ViewportAnchor, ViewportState } from "./viewportTypes"
import { clampViewportZoom } from "./zoomPolicy"

function nextRevision(state: ViewportState): number {
  return state.revision + 1
}

function createAnchorId(state: ViewportState, targetId: string): string {
  return `viewport-anchor-${state.revision + 1}-${targetId}`
}

function withRevision(state: ViewportState, patch: Partial<ViewportState>): ViewportState {
  return {
    ...state,
    ...patch,
    revision: nextRevision(state),
  }
}

export function applyViewportAction(state: ViewportState, action: ViewportAction): ViewportState {
  switch (action.kind) {
    case "viewport.measured":
      return withRevision(state, {
        contentHeight: action.contentHeight ?? state.contentHeight,
        contentWidth: action.contentWidth ?? state.contentWidth,
        viewportHeight: action.viewportHeight,
        viewportWidth: action.viewportWidth,
      })

    case "viewport.scrolled":
      return withRevision(state, {
        scrollLeft: Math.max(0, action.scrollLeft),
        scrollTop: Math.max(0, action.scrollTop),
        visiblePageIds: action.visiblePageIds ?? state.visiblePageIds,
      })

    case "viewport.scrollRootSynced":
      return withRevision(state, {
        contentHeight: Math.max(0, action.contentHeight),
        contentWidth: Math.max(0, action.contentWidth),
        scrollLeft: Math.max(0, action.scrollLeft),
        scrollTop: Math.max(0, action.scrollTop),
        viewportHeight: Math.max(0, action.viewportHeight),
        viewportWidth: Math.max(0, action.viewportWidth),
        visiblePageIds: action.visiblePageIds ?? state.visiblePageIds,
      })

    case "viewport.setZoom": {
      const pendingAnchor = action.anchor
        ? {
            ...action.anchor,
            id: createAnchorId(state, action.anchor.targetId),
          }
        : state.pendingAnchor

      return withRevision(state, {
        pendingAnchor,
        zoom: clampViewportZoom(action.zoom),
      })
    }

    case "viewport.jumpToNode": {
      const pendingAnchor: ViewportAnchor = {
        align: action.align,
        id: createAnchorId(state, action.nodeId),
        kind: "node",
        offset: 0,
        reason: action.reason,
        targetId: action.nodeId,
      }

      return withRevision(state, {
        pendingAnchor,
      })
    }

    case "viewport.anchorApplied":
      if (state.pendingAnchor?.id !== action.anchorId) return state
      return withRevision(state, {
        pendingAnchor: null,
      })
  }
}
