import type { PaperPreset } from "../paper/paperModel"

export type EditorCommandKind =
  | "layout.requestLive"
  | "node.delete"
  | "node.duplicate"
  | "node.openTextDraft"
  | "node.reorder"
  | "selection.selectNode"
  | "viewport.setZoom"
  | "viewport.setPaperPreset"

export type EditorCommandSource = "canvas" | "inspector" | "keyboard" | "outline" | "system" | "toolbar"
export type NodeReorderDirection = "down" | "up"

interface BaseEditorCommand {
  kind: EditorCommandKind
  source: EditorCommandSource
}

export interface SelectNodeCommand extends BaseEditorCommand {
  kind: "selection.selectNode"
  reason: string
  target: {
    nodeId: string
  }
}

export interface SetViewportZoomCommand extends BaseEditorCommand {
  kind: "viewport.setZoom"
  payload: {
    zoom: number
  }
}

export interface SetPaperPresetCommand extends BaseEditorCommand {
  kind: "viewport.setPaperPreset"
  payload: {
    preset: PaperPreset
  }
}

export interface RequestLiveLayoutCommand extends BaseEditorCommand {
  kind: "layout.requestLive"
  reason: string
  target?: {
    nodeIds?: string[]
  }
}

export interface OpenTextDraftCommand extends BaseEditorCommand {
  kind: "node.openTextDraft"
  reason: string
  target: {
    nodeId: string
  }
}

export interface DeleteNodeCommand extends BaseEditorCommand {
  kind: "node.delete"
  reason: string
  target: {
    nodeId: string
  }
}

export interface DuplicateNodeCommand extends BaseEditorCommand {
  kind: "node.duplicate"
  reason: string
  target: {
    nodeId: string
  }
}

export interface ReorderNodeCommand extends BaseEditorCommand {
  kind: "node.reorder"
  payload: {
    direction: NodeReorderDirection
  }
  reason: string
  target: {
    nodeId: string
  }
}

export type NodeSurfaceCommand =
  | DeleteNodeCommand
  | DuplicateNodeCommand
  | OpenTextDraftCommand
  | ReorderNodeCommand

export type EditorCommand =
  | DeleteNodeCommand
  | DuplicateNodeCommand
  | OpenTextDraftCommand
  | RequestLiveLayoutCommand
  | ReorderNodeCommand
  | SelectNodeCommand
  | SetViewportZoomCommand
  | SetPaperPresetCommand

export type CommandChangedArea = "core" | "jobs" | "paper" | "selection" | "viewport"

export type CommandPolicySeverity = "blocked" | "info" | "warning"
