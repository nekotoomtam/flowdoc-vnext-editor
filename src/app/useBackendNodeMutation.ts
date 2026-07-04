import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import {
  createBackendMutationRequestFromCommand,
  type BackendMutationCommand,
} from "../editor/backend/backendMutationRequests"
import type { FlowDocBackendClient } from "../editor/backend/backendTransport"
import type { NodeReorderDirection } from "../editor/commands/commandTypes"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import { applyRuntimeBackendMutationCommandResult } from "../editor/runtime/runtimeBackendMutationCommand"
import {
  IDLE_NODE_MUTATION_STATUS,
  type RuntimeNodeMutationStatus,
} from "../editor/runtime/runtimeMutationStatus"

export interface UseBackendNodeMutationOptions {
  backendClient: Pick<FlowDocBackendClient, "commitMutation">
  editorState: EditorRuntimeState
  setEditorState: Dispatch<SetStateAction<EditorRuntimeState>>
}

export interface UseBackendNodeMutationResult {
  deleteNode: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  mutationStatus: RuntimeNodeMutationStatus
  reorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  reorderNodeToIndex: (nodeId: string, toIndex: number) => void
}

function mutationFailureMessage(command: BackendMutationCommand, reason: string): string {
  if (reason === "base-revision-mismatch" || reason === "blocked-stale") {
    return "Command blocked by a newer document revision."
  }
  if (reason === "document-mismatch") return "Command blocked by document mismatch."
  if (reason === "revision-stale" || reason === "stale") return "Command blocked by stale revision."
  if (command.kind === "node.delete") return "Delete failed."
  if (command.kind === "node.duplicate") return "Duplicate failed."
  return "Move failed."
}

function pendingMessage(command: BackendMutationCommand): string {
  if (command.kind === "node.delete") return "Deleting selected node."
  if (command.kind === "node.duplicate") return "Duplicating selected node."
  if ("toIndex" in command.payload) return "Moving selected node."
  return command.payload.direction === "up" ? "Moving selected node up." : "Moving selected node down."
}

function appliedMessage(command: BackendMutationCommand): string {
  if (command.kind === "node.delete") return "Node deleted."
  if (command.kind === "node.duplicate") return "Node duplicated."
  if ("toIndex" in command.payload) return "Node moved."
  return command.payload.direction === "up" ? "Node moved up." : "Node moved down."
}

export function useBackendNodeMutation({
  backendClient,
  editorState,
  setEditorState,
}: UseBackendNodeMutationOptions): UseBackendNodeMutationResult {
  const editorStateRef = useRef(editorState)
  const [mutationStatus, setMutationStatus] = useState<RuntimeNodeMutationStatus>(
    IDLE_NODE_MUTATION_STATUS,
  )

  useEffect(() => {
    editorStateRef.current = editorState
  }, [editorState])

  const runMutationCommand = useCallback((command: BackendMutationCommand) => {
    const nodeId = command.target.nodeId
    const built = createBackendMutationRequestFromCommand(editorStateRef.current, command)
    if (built.status === "blocked") {
      setMutationStatus({
        command: command.kind,
        message: mutationFailureMessage(command, built.reason),
        nodeId,
        status: "failed",
      })
      return
    }

    setMutationStatus({
      command: command.kind,
      message: pendingMessage(command),
      nodeId,
      status: "pending",
    })

    void backendClient.commitMutation(built.request)
      .then((result) => {
        let nextStatus: RuntimeNodeMutationStatus = IDLE_NODE_MUTATION_STATUS

        setEditorState((currentState) => {
          const applied = applyRuntimeBackendMutationCommandResult(currentState, command, result)
          const commandResult = applied.commandResult.result

          nextStatus = commandResult.status === "applied"
            ? {
                command: command.kind,
                message: appliedMessage(command),
                nodeId: applied.state.selection.selectedNodeId ?? nodeId,
                status: "applied",
              }
            : {
                command: command.kind,
                message: commandResult.status === "rejected"
                  ? mutationFailureMessage(command, commandResult.reason)
                  : mutationFailureMessage(command, "unknown"),
                nodeId,
                status: "failed",
              }

          editorStateRef.current = applied.state
          return applied.state
        })

        setMutationStatus(nextStatus)
      })
      .catch(() => {
        setMutationStatus({
          command: command.kind,
          message: "Backend unavailable.",
          nodeId,
          status: "failed",
        })
      })
  }, [backendClient, setEditorState])

  const deleteNode = useCallback((nodeId: string) => {
    runMutationCommand({
      kind: "node.delete",
      reason: "inspector-delete",
      source: "inspector",
      target: {
        nodeId,
      },
    })
  }, [runMutationCommand])

  const duplicateNode = useCallback((nodeId: string) => {
    runMutationCommand({
      kind: "node.duplicate",
      reason: "inspector-duplicate",
      source: "inspector",
      target: {
        nodeId,
      },
    })
  }, [runMutationCommand])

  const reorderNode = useCallback((nodeId: string, direction: NodeReorderDirection) => {
    runMutationCommand({
      kind: "node.reorder",
      payload: {
        direction,
      },
      reason: `inspector-move-${direction}`,
      source: "inspector",
      target: {
        nodeId,
      },
    })
  }, [runMutationCommand])

  const reorderNodeToIndex = useCallback((nodeId: string, toIndex: number) => {
    runMutationCommand({
      kind: "node.reorder",
      payload: {
        toIndex,
      },
      reason: "canvas-drop-reorder",
      source: "canvas",
      target: {
        nodeId,
      },
    })
  }, [runMutationCommand])

  return {
    deleteNode,
    duplicateNode,
    mutationStatus,
    reorderNode,
    reorderNodeToIndex,
  }
}
