import type { CommandChangedArea, EditorCommandKind, EditorCommandSource } from "../commands/commandTypes"

export type HistoryRecordKind =
  | "documentMutation"
  | "layoutRequest"
  | "selection"
  | "structuralCommand"
  | "textDraftCommit"
  | "viewport"

export interface HistoryRecordDraft {
  changed: CommandChangedArea[]
  documentRevisionAfter: number | null
  documentRevisionBefore: number
  kind: HistoryRecordKind
  label: string
  mergeKey: string | null
  payloadSummary: string | null
  source: EditorCommandSource
  sourceCommand: EditorCommandKind
  targetNodeIds: string[]
  timestamp: number
  undoable: boolean
}

export interface HistoryStackState {
  canRedo: boolean
  canUndo: boolean
  records: HistoryRecordDraft[]
  redoDepth: number
  undoDepth: number
}
