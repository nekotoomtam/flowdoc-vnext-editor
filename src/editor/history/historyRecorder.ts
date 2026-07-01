import type { CommandResult } from "../commands/commandResult"
import type { EditorCommand } from "../commands/commandTypes"
import type { HistoryRecordDraft, HistoryRecordKind } from "./historyTypes"

export interface HistoryRecordInput {
  command: EditorCommand
  documentRevisionAfter: number
  documentRevisionBefore: number
  result: CommandResult
  timestamp: number
}

function getCommandTargetNodeIds(command: EditorCommand): string[] {
  if (command.kind === "selection.selectNode") return [command.target.nodeId]
  return []
}

function getHistoryRecordKind(command: EditorCommand): HistoryRecordKind {
  if (command.kind === "selection.selectNode") return "selection"
  return "viewport"
}

function getHistoryRecordLabel(command: EditorCommand): string {
  switch (command.kind) {
    case "selection.selectNode":
      return "Select node"
    case "viewport.setPaperPreset":
      return "Set paper preset"
    case "viewport.setZoom":
      return "Set viewport zoom"
  }
}

function getPayloadSummary(command: EditorCommand): string | null {
  switch (command.kind) {
    case "selection.selectNode":
      return command.target.nodeId
    case "viewport.setPaperPreset":
      return command.payload.preset
    case "viewport.setZoom":
      return `${Math.round(command.payload.zoom * 100)}%`
  }
}

export function createHistoryRecord(input: HistoryRecordInput): HistoryRecordDraft | null {
  if (input.result.status !== "applied") return null

  return {
    changed: input.result.changed,
    documentRevisionAfter: input.documentRevisionAfter,
    documentRevisionBefore: input.documentRevisionBefore,
    kind: getHistoryRecordKind(input.command),
    label: getHistoryRecordLabel(input.command),
    mergeKey: null,
    payloadSummary: getPayloadSummary(input.command),
    source: input.command.source,
    sourceCommand: input.command.kind,
    targetNodeIds: getCommandTargetNodeIds(input.command),
    timestamp: input.timestamp,
    undoable: false,
  }
}
