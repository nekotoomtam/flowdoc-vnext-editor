import type { EditorRuntimeState } from "../runtime/editorState"
import type { EditorCommand, CommandPolicySeverity } from "./commandTypes"

export interface CommandPolicyResult {
  allowed: boolean
  reason: string | null
  severity: CommandPolicySeverity
}

export function allowCommand(): CommandPolicyResult {
  return {
    allowed: true,
    reason: null,
    severity: "info",
  }
}

export function rejectCommand(reason: string, severity: CommandPolicySeverity = "blocked"): CommandPolicyResult {
  return {
    allowed: false,
    reason,
    severity,
  }
}

export function canExecuteCommand(command: EditorCommand, state: EditorRuntimeState): CommandPolicyResult {
  switch (command.kind) {
    case "layout.requestLive": {
      const missingNodeId = command.target?.nodeIds?.find((nodeId) => !state.view.nodeById[nodeId])
      if (missingNodeId) {
        return rejectCommand(`Unknown layout target node: ${missingNodeId}`)
      }
      return allowCommand()
    }

    case "selection.selectNode":
      if (!state.view.nodeById[command.target.nodeId]) {
        return rejectCommand(`Unknown node: ${command.target.nodeId}`)
      }
      return allowCommand()

    case "viewport.setZoom":
      if (!Number.isFinite(command.payload.zoom)) {
        return rejectCommand("Zoom must be a finite number")
      }
      return allowCommand()

    case "viewport.setPaperPreset":
      if (command.payload.preset !== "A4" && command.payload.preset !== "Letter") {
        return rejectCommand(`Unsupported paper preset: ${command.payload.preset}`)
      }
      return allowCommand()
  }
}
