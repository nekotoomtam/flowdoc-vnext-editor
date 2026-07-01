import type { HistoryRecordDraft, HistoryStackState } from "./historyTypes"

export function createHistoryStackState(records: HistoryRecordDraft[] = []): HistoryStackState {
  return {
    canRedo: false,
    canUndo: false,
    records,
    redoDepth: 0,
    undoDepth: 0,
  }
}

export function pushHistoryRecord(
  state: HistoryStackState,
  record: HistoryRecordDraft,
): HistoryStackState {
  return createHistoryStackState([...state.records, record])
}
