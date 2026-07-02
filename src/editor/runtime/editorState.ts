import type { CoreEditorSeed } from "../../core/coreTypes"
import { createFrontendCoreWorkingSetFromSeed } from "../coreBinding/workingSetFactory"
import type { FrontendCoreWorkingSet } from "../coreBinding/workingSetTypes"
import { createHistoryStackState } from "../history/historyStack"
import type { HistoryStackState } from "../history/historyTypes"
import { createJobQueueState } from "../jobs/jobQueue"
import type { EditorJobQueueState } from "../jobs/jobTypes"
import {
  createDefaultPaperModel,
  setPaperPreset,
  setPaperZoom,
  type PaperModel,
  type PaperPreset,
} from "../paper/paperModel"
import { createSelectionState, selectNode, type SelectionState } from "../selection/selectionState"
import { applyViewportAction } from "../viewport/viewportActions"
import type { ViewportScrollRootFacts } from "../viewport/viewportMeasurement"
import { createViewportState, type ViewportState } from "../viewport/viewportState"
import { createEditorView, type EditorView } from "./editorView"
import { createEditorSeedFromWorkingSet } from "./runtimeCoreBinding"

export interface EditorRuntimeState {
  core: FrontendCoreWorkingSet
  history: HistoryStackState
  jobs: EditorJobQueueState
  paper: PaperModel
  seed: CoreEditorSeed
  selection: SelectionState
  viewport: ViewportState
  view: EditorView
}

function syncPaperWithViewport(paper: PaperModel, viewport: ViewportState): PaperModel {
  return setPaperZoom(paper, viewport.zoom)
}

function createEditorRuntimeState(
  core: FrontendCoreWorkingSet,
  seed: CoreEditorSeed,
  view: EditorView,
): EditorRuntimeState {
  const paper = createDefaultPaperModel()
  const viewport = createViewportState(paper.zoom)

  return {
    core,
    history: createHistoryStackState(),
    jobs: createJobQueueState(),
    paper: syncPaperWithViewport(paper, viewport),
    seed,
    selection: createSelectionState(
      view.renderableNodeIds[0] ?? view.visibleNodeIds[0] ?? "root",
      "boot",
    ),
    viewport,
    view,
  }
}

export function createInitialEditorStateFromWorkingSet(
  workingSet: FrontendCoreWorkingSet,
): EditorRuntimeState {
  return createEditorRuntimeState(
    workingSet,
    createEditorSeedFromWorkingSet(workingSet),
    workingSet.readModel,
  )
}

export function createInitialEditorState(seed: CoreEditorSeed): EditorRuntimeState {
  const workingSet = createFrontendCoreWorkingSetFromSeed(seed)

  return createEditorRuntimeState(workingSet, seed, createEditorView(seed))
}

export function selectEditorNode(
  state: EditorRuntimeState,
  nodeId: string,
  reason: string,
): EditorRuntimeState {
  if (!state.view.nodeById[nodeId]) return state

  return {
    ...state,
    selection: selectNode(state.selection, nodeId, reason),
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

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function isViewportScrollRootFactsCurrent(
  viewport: ViewportState,
  facts: ViewportScrollRootFacts,
): boolean {
  return viewport.contentHeight === facts.contentHeight
    && viewport.contentWidth === facts.contentWidth
    && viewport.scrollLeft === facts.scrollLeft
    && viewport.scrollTop === facts.scrollTop
    && viewport.viewportHeight === facts.viewportHeight
    && viewport.viewportWidth === facts.viewportWidth
    && sameStringList(viewport.visiblePageIds, facts.visiblePageIds)
}

export function recordViewportScrollRootFacts(
  state: EditorRuntimeState,
  facts: ViewportScrollRootFacts,
): EditorRuntimeState {
  if (isViewportScrollRootFactsCurrent(state.viewport, facts)) return state

  return {
    ...state,
    viewport: applyViewportAction(state.viewport, {
      ...facts,
      kind: "viewport.scrollRootSynced",
    }),
  }
}
