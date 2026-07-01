import type { CommandChangedArea, EditorCommand, EditorCommandKind } from "./commandTypes"
import type { EditorJobRequest } from "../jobs/jobTypes"

export type CommandResult =
  | {
      changed: CommandChangedArea[]
      command: EditorCommandKind
      stateChanged: boolean
      status: "applied"
    }
  | {
      command: EditorCommandKind
      jobRequest: EditorJobRequest
      stateChanged: false
      status: "queued"
    }
  | {
      command: EditorCommandKind
      reason: string
      stateChanged: false
      status: "rejected"
    }
  | {
      command: EditorCommandKind
      reason: string
      stateChanged: false
      status: "noop"
    }

export interface CommandExecutionResult<State> {
  command: EditorCommand
  result: CommandResult
  state: State
}

export function createAppliedCommandResult(
  command: EditorCommandKind,
  changed: CommandChangedArea[],
): CommandResult {
  return {
    changed,
    command,
    stateChanged: changed.length > 0,
    status: "applied",
  }
}

export function createNoopCommandResult(command: EditorCommandKind, reason: string): CommandResult {
  return {
    command,
    reason,
    stateChanged: false,
    status: "noop",
  }
}

export function createQueuedCommandResult(
  command: EditorCommandKind,
  jobRequest: EditorJobRequest,
): CommandResult {
  return {
    command,
    jobRequest,
    stateChanged: false,
    status: "queued",
  }
}

export function createRejectedCommandResult(command: EditorCommandKind, reason: string): CommandResult {
  return {
    command,
    reason,
    stateChanged: false,
    status: "rejected",
  }
}
