import type { EditorRuntimeState } from "../runtime/editorState"
import type { NodeCommandCapabilities } from "../coreBinding/capabilityMirror"
import { resolveCommandNodeTarget } from "./commandTargets"
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

interface SurfacePolicyTarget {
  capabilities: NodeCommandCapabilities
  nodeId: string
}

function isReorderDirection(value: unknown): boolean {
  return value === "down" || value === "up"
}

function resolveSurfacePolicyTarget(
  state: EditorRuntimeState,
  nodeId: string,
): CommandPolicyResult | SurfacePolicyTarget {
  const target = resolveCommandNodeTarget(state, nodeId)

  if (!target.inputNodeExists) {
    return rejectCommand(`Unknown node: ${nodeId}`)
  }
  if (!target.nodeId) {
    return rejectCommand(`Node does not resolve to an operation surface: ${nodeId}`)
  }
  if (!target.capabilities?.selectable) {
    return rejectCommand(`Operation surface is not selectable: ${target.nodeId}`)
  }

  return {
    capabilities: target.capabilities,
    nodeId: target.nodeId,
  }
}

function isCommandPolicyResult(value: CommandPolicyResult | SurfacePolicyTarget): value is CommandPolicyResult {
  return "allowed" in value
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

    case "selection.selectNode": {
      const target = resolveSurfacePolicyTarget(state, command.target.nodeId)
      if (isCommandPolicyResult(target)) return target
      return allowCommand()
    }

    case "node.openTextDraft": {
      const target = resolveSurfacePolicyTarget(state, command.target.nodeId)
      if (isCommandPolicyResult(target)) return target
      if (!target.capabilities.canOpenTextDraft) {
        return rejectCommand(
          target.capabilities.reasons[0] ?? `Operation surface cannot open a text draft: ${target.nodeId}`,
        )
      }
      return allowCommand()
    }

    case "node.delete": {
      const target = resolveSurfacePolicyTarget(state, command.target.nodeId)
      if (isCommandPolicyResult(target)) return target
      if (!target.capabilities.deletable) {
        return rejectCommand(`Operation surface cannot be deleted: ${target.nodeId}`)
      }
      return allowCommand()
    }

    case "node.duplicate": {
      const target = resolveSurfacePolicyTarget(state, command.target.nodeId)
      if (isCommandPolicyResult(target)) return target
      if (!target.capabilities.duplicable) {
        return rejectCommand(`Operation surface cannot be duplicated: ${target.nodeId}`)
      }
      return allowCommand()
    }

    case "node.reorder": {
      const target = resolveSurfacePolicyTarget(state, command.target.nodeId)
      if (isCommandPolicyResult(target)) return target
      if (!isReorderDirection(command.payload.direction)) {
        return rejectCommand(`Unsupported reorder direction: ${String(command.payload.direction)}`)
      }
      if (!target.capabilities.reorderable) {
        return rejectCommand(`Operation surface cannot be reordered: ${target.nodeId}`)
      }
      return allowCommand()
    }

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
