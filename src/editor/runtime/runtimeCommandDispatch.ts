import { executeEditorCommand } from "../commands/commandExecutor"
import type { CommandExecutionResult } from "../commands/commandResult"
import type { EditorCommand } from "../commands/commandTypes"
import { createHistoryRecord } from "../history/historyRecorder"
import { pushHistoryRecord } from "../history/historyStack"
import { enqueueEditorJob } from "../jobs/jobQueue"
import type { EditorRuntimeState } from "./editorState"

export interface EditorRuntimeCommandDispatch {
  commandResult: CommandExecutionResult<EditorRuntimeState>
  state: EditorRuntimeState
}

function getDocumentRevision(state: EditorRuntimeState): number {
  return state.core.envelope.documentRevision
}

export function dispatchEditorRuntimeCommand(
  state: EditorRuntimeState,
  command: EditorCommand,
): EditorRuntimeCommandDispatch {
  const commandResult = executeEditorCommand(state, command)
  const commandState =
    commandResult.result.status === "queued"
      ? {
          ...commandResult.state,
          jobs: enqueueEditorJob(commandResult.state.jobs, commandResult.result.jobRequest).state,
        }
      : commandResult.state
  const record = createHistoryRecord({
    command: commandResult.command,
    documentRevisionAfter: getDocumentRevision(commandState),
    documentRevisionBefore: getDocumentRevision(state),
    result: commandResult.result,
    timestamp: Date.now(),
  })
  const nextState = record
    ? {
        ...commandState,
        history: pushHistoryRecord(commandState.history, record),
      }
    : commandState

  return {
    commandResult,
    state: nextState,
  }
}
