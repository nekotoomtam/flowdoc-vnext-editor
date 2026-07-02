import {
  selectEditorNode,
  selectPaperPreset,
  selectPaperZoom,
  type EditorRuntimeState,
} from "../runtime/editorState"
import { resolveEditorSelectionTarget } from "../runtime/editorView"
import { canExecuteCommand } from "./commandPolicy"
import {
  createAppliedCommandResult,
  createNoopCommandResult,
  createQueuedCommandResult,
  createRejectedCommandResult,
  type CommandExecutionResult,
} from "./commandResult"
import type { EditorCommand } from "./commandTypes"

function isSameState(left: EditorRuntimeState, right: EditorRuntimeState): boolean {
  return left === right
}

export function executeEditorCommand(
  state: EditorRuntimeState,
  command: EditorCommand,
): CommandExecutionResult<EditorRuntimeState> {
  const policy = canExecuteCommand(command, state)
  if (!policy.allowed) {
    return {
      command,
      result: createRejectedCommandResult(command.kind, policy.reason ?? "Command rejected"),
      state,
    }
  }

  switch (command.kind) {
    case "layout.requestLive": {
      const targetNodeIds = command.target?.nodeIds ?? []
      const dedupeTarget = targetNodeIds.length > 0 ? targetNodeIds.join(",") : "document"

      return {
        command,
        result: createQueuedCommandResult(command.kind, {
          dedupeKey: `layout.live:${dedupeTarget}`,
          kind: "layout.live",
          priority: "visible",
          reason: command.reason,
          requestRevision: state.core.envelope.documentRevision,
          target: targetNodeIds.length > 0 ? { nodeIds: targetNodeIds } : undefined,
        }),
        state,
      }
    }

    case "selection.selectNode": {
      const selectionTargetId = resolveEditorSelectionTarget(state.view, command.target.nodeId)
      if (!selectionTargetId) {
        return {
          command,
          result: createNoopCommandResult(command.kind, "Node is not selectable"),
          state,
        }
      }
      const normalizedCommand = selectionTargetId === command.target.nodeId
        ? command
        : {
            ...command,
            target: {
              nodeId: selectionTargetId,
            },
          }

      if (state.selection.selectedNodeId === selectionTargetId) {
        return {
          command: normalizedCommand,
          result: createNoopCommandResult(command.kind, "Node is already selected"),
          state,
        }
      }

      const nextState = selectEditorNode(state, command.target.nodeId, command.reason)
      return {
        command: normalizedCommand,
        result: createAppliedCommandResult(command.kind, ["selection"]),
        state: nextState,
      }
    }

    case "viewport.setPaperPreset": {
      if (state.paper.preset === command.payload.preset) {
        return {
          command,
          result: createNoopCommandResult(command.kind, "Paper preset is already active"),
          state,
        }
      }

      const nextState = selectPaperPreset(state, command.payload.preset)
      return {
        command,
        result: createAppliedCommandResult(command.kind, ["paper"]),
        state: nextState,
      }
    }

    case "viewport.setZoom": {
      const nextState = selectPaperZoom(state, command.payload.zoom)
      if (isSameState(nextState, state) || nextState.viewport.zoom === state.viewport.zoom) {
        return {
          command,
          result: createNoopCommandResult(command.kind, "Zoom is already active"),
          state,
        }
      }

      return {
        command,
        result: createAppliedCommandResult(command.kind, ["viewport", "paper"]),
        state: nextState,
      }
    }
  }
}
