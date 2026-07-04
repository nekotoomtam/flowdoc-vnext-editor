import type { RuntimeNodeMutationStatus } from "../runtime/runtimeMutationStatus"

export type CanvasKeyboardReorderFocusDecision =
  | {
      status: "clear"
    }
  | {
      nodeId: string
      status: "focus"
    }
  | {
      status: "idle"
    }

export function getCanvasKeyboardReorderFocusDecision(
  pendingNodeId: string | null,
  mutationStatus: RuntimeNodeMutationStatus,
): CanvasKeyboardReorderFocusDecision {
  if (!pendingNodeId) return { status: "idle" }
  if (mutationStatus.command !== "node.reorder") return { status: "idle" }
  if (mutationStatus.nodeId !== pendingNodeId) return { status: "idle" }

  if (mutationStatus.status === "applied") {
    return {
      nodeId: pendingNodeId,
      status: "focus",
    }
  }

  if (mutationStatus.status === "failed") return { status: "clear" }
  return { status: "idle" }
}
