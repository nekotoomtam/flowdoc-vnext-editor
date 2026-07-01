import type { CoreEditorSeed } from "../../core/coreTypes"
import {
  createDefaultPaperModel,
  setPaperPreset,
  setPaperZoom,
  type PaperModel,
  type PaperPreset,
} from "../paper/paperModel"
import { applyViewportAction } from "../viewport/viewportActions"
import { createViewportState, type ViewportState } from "../viewport/viewportState"
import { createEditorView, type EditorView } from "./editorView"

export interface EditorRuntimeState {
  paper: PaperModel
  seed: CoreEditorSeed
  selectedNodeId: string
  selectionReason: string
  viewport: ViewportState
  view: EditorView
}

function syncPaperWithViewport(paper: PaperModel, viewport: ViewportState): PaperModel {
  return setPaperZoom(paper, viewport.zoom)
}

export function createInitialEditorState(seed: CoreEditorSeed): EditorRuntimeState {
  const view = createEditorView(seed)
  const paper = createDefaultPaperModel()
  const viewport = createViewportState(paper.zoom)

  return {
    paper: syncPaperWithViewport(paper, viewport),
    seed,
    selectedNodeId: view.renderableNodeIds[0] ?? view.visibleNodeIds[0] ?? "root",
    selectionReason: "boot",
    viewport,
    view,
  }
}

export function selectEditorNode(
  state: EditorRuntimeState,
  nodeId: string,
  reason: string,
): EditorRuntimeState {
  if (!state.view.nodeById[nodeId]) return state

  return {
    ...state,
    selectedNodeId: nodeId,
    selectionReason: reason,
  }
}

export function selectPaperPreset(state: EditorRuntimeState, preset: PaperPreset): EditorRuntimeState {
  const paper = setPaperPreset(state.paper, preset)

  return {
    ...state,
    paper: syncPaperWithViewport(paper, state.viewport),
  }
}

export function selectPaperZoom(state: EditorRuntimeState, zoom: number): EditorRuntimeState {
  const viewport = applyViewportAction(state.viewport, {
    kind: "viewport.setZoom",
    zoom,
  })

  return {
    ...state,
    paper: syncPaperWithViewport(state.paper, viewport),
    viewport,
  }
}
