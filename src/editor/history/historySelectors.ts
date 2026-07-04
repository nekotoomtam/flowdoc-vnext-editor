import type { HistoryRecordDraft, HistoryStackState } from "./historyTypes"

export interface HistoryStackSummary {
  documentChangeRecordCount: number
  localRecordCount: number
  undoableRecordCount: number
}

export function isDocumentChangeHistoryRecord(record: HistoryRecordDraft): boolean {
  return record.kind === "documentMutation"
    || record.kind === "structuralCommand"
    || record.kind === "textDraftCommit"
}

export function getHistoryStackSummary(history: HistoryStackState): HistoryStackSummary {
  return history.records.reduce<HistoryStackSummary>((summary, record) => ({
    documentChangeRecordCount: summary.documentChangeRecordCount
      + (isDocumentChangeHistoryRecord(record) ? 1 : 0),
    localRecordCount: summary.localRecordCount + 1,
    undoableRecordCount: summary.undoableRecordCount + (record.undoable ? 1 : 0),
  }), {
    documentChangeRecordCount: 0,
    localRecordCount: 0,
    undoableRecordCount: 0,
  })
}
