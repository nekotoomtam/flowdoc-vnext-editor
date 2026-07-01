import type { CoreEditorSeed } from "../../core/coreTypes"
import {
  createDefaultPaperModel,
  setPaperPreset,
  setPaperZoom,
  type PaperModel,
  type PaperPreset,
} from "../paper/paperModel"
import { createEditorView, type EditorView } from "./editorView"

export interface EditorRuntimeState {
  paper: PaperModel
  seed: CoreEditorSeed
  selectedNodeId: string
  selectionReason: string
  view: EditorView
}

export function createInitialEditorState(seed: CoreEditorSeed): EditorRuntimeState {
  const view = createEditorView(seed)

  return {
    paper: createDefaultPaperModel(),
    seed,
    selectedNodeId: view.renderableNodeIds[0] ?? view.visibleNodeIds[0] ?? "root",
    selectionReason: "boot",
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
  return {
    ...state,
    paper: setPaperPreset(state.paper, preset),
  }
}

export function selectPaperZoom(state: EditorRuntimeState, zoom: number): EditorRuntimeState {
  return {
    ...state,
    paper: setPaperZoom(state.paper, zoom),
  }
}
