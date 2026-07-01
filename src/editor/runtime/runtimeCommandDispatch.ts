import { executeEditorCommand } from "../commands/commandExecutor"
import type { CommandExecutionResult } from "../commands/commandResult"
import type { EditorCommand } from "../commands/commandTypes"
import { createHistoryRecord } from "../history/historyRecorder"
import { pushHistoryRecord } from "../history/historyStack"
import type { EditorRuntimeState } from "./editorState"

export interface EditorRuntimeCommandDispatch {
  commandResult: CommandExecutionResult<EditorRuntimeState>
  state: EditorRuntimeState
}

function getDocumentRevision(state: EditorRuntimeState): number {
  return state.seed.document.documentVersion
}

export function dispatchEditorRuntimeCommand(
  state: EditorRuntimeState,
  command: EditorCommand,
): EditorRuntimeCommandDispatch {
  const commandResult = executeEditorCommand(state, command)
  const record = createHistoryRecord({
    command,
    documentRevisionAfter: getDocumentRevision(commandResult.state),
    documentRevisionBefore: getDocumentRevision(state),
    result: commandResult.result,
    timestamp: Date.now(),
  })
  const nextState = record
    ? {
        ...commandResult.state,
        history: pushHistoryRecord(commandResult.state.history, record),
      }
    : commandResult.state

  return {
    commandResult,
    state: nextState,
  }
}
