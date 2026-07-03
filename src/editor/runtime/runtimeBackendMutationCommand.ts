import type { BackendMutationCommand } from "../backend/backendMutationRequests"
import type { BackendMutationResultEnvelope } from "../backend/backendTransport"
import {
  createAppliedCommandResult,
  createRejectedCommandResult,
  type CommandExecutionResult,
} from "../commands/commandResult"
import { createHistoryRecord } from "../history/historyRecorder"
import { pushHistoryRecord } from "../history/historyStack"
import type { EditorRuntimeState } from "./editorState"
import {
  applyRuntimeBackendMutationResult,
  type RuntimeBackendMutationApply,
} from "./runtimeBackendMutation"

export interface RuntimeBackendMutationCommandApply {
  commandResult: CommandExecutionResult<EditorRuntimeState>
  mutationApply: RuntimeBackendMutationApply
  state: EditorRuntimeState
}

export interface ApplyRuntimeBackendMutationCommandResultOptions {
  timestamp?: number
}

function rejectedReason(apply: RuntimeBackendMutationApply): string {
  return apply.reason ?? apply.status
}

export function applyRuntimeBackendMutationCommandResult(
  state: EditorRuntimeState,
  command: BackendMutationCommand,
  result: BackendMutationResultEnvelope,
  options: ApplyRuntimeBackendMutationCommandResultOptions = {},
): RuntimeBackendMutationCommandApply {
  const mutationApply = applyRuntimeBackendMutationResult(state, result)

  if (mutationApply.status !== "applied") {
    const commandResult = {
      command,
      result: createRejectedCommandResult(command.kind, rejectedReason(mutationApply)),
      state,
    }

    return {
      commandResult,
      mutationApply,
      state,
    }
  }

  const appliedResult = createAppliedCommandResult(command.kind, ["core", "selection"])
  const historyRecord = createHistoryRecord({
    command,
    documentRevisionAfter: mutationApply.state.core.envelope.documentRevision,
    documentRevisionBefore: state.core.envelope.documentRevision,
    result: appliedResult,
    timestamp: options.timestamp ?? Date.now(),
  })
  const nextState = historyRecord
    ? {
        ...mutationApply.state,
        history: pushHistoryRecord(mutationApply.state.history, historyRecord),
      }
    : mutationApply.state
  const commandResult = {
    command,
    result: appliedResult,
    state: nextState,
  }

  return {
    commandResult,
    mutationApply: {
      ...mutationApply,
      state: nextState,
    },
    state: nextState,
  }
}
