import type { PaperPreset } from "../paper/paperModel"

export type EditorCommandKind =
  | "selection.selectNode"
  | "viewport.setZoom"
  | "viewport.setPaperPreset"

export type EditorCommandSource = "canvas" | "keyboard" | "outline" | "system" | "toolbar"

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

export type EditorCommand = SelectNodeCommand | SetViewportZoomCommand | SetPaperPresetCommand

export type CommandChangedArea = "paper" | "selection" | "viewport"

export type CommandPolicySeverity = "blocked" | "info" | "warning"
