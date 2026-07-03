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
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import { applyRuntimeBackendMutationCommandResult } from "../editor/runtime/runtimeBackendMutationCommand"
import {
  IDLE_DUPLICATE_MUTATION_STATUS,
  type RuntimeDuplicateMutationStatus,
} from "../editor/runtime/runtimeMutationStatus"

export interface UseBackendDuplicateNodeOptions {
  backendClient: Pick<FlowDocBackendClient, "commitMutation">
  editorState: EditorRuntimeState
  setEditorState: Dispatch<SetStateAction<EditorRuntimeState>>
}

export interface UseBackendDuplicateNodeResult {
  duplicateNode: (nodeId: string) => void
  duplicateStatus: RuntimeDuplicateMutationStatus
}

function duplicateFailureMessage(reason: string): string {
  if (reason === "base-revision-mismatch" || reason === "blocked-stale") {
    return "Duplicate blocked by a newer document revision."
  }
  if (reason === "document-mismatch") return "Duplicate blocked by document mismatch."
  if (reason === "rejected") return "Duplicate rejected."
  if (reason === "stale") return "Duplicate blocked by stale revision."
  return "Duplicate failed."
}

export function useBackendDuplicateNode({
  backendClient,
  editorState,
  setEditorState,
}: UseBackendDuplicateNodeOptions): UseBackendDuplicateNodeResult {
  const editorStateRef = useRef(editorState)
  const [duplicateStatus, setDuplicateStatus] = useState<RuntimeDuplicateMutationStatus>(
    IDLE_DUPLICATE_MUTATION_STATUS,
  )

  useEffect(() => {
    editorStateRef.current = editorState
  }, [editorState])

  const duplicateNode = useCallback((nodeId: string) => {
    const command: BackendMutationCommand = {
      kind: "node.duplicate",
      reason: "inspector-duplicate",
      source: "inspector",
      target: {
        nodeId,
      },
    }
    const built = createBackendMutationRequestFromCommand(editorStateRef.current, command)
    if (built.status === "blocked") {
      setDuplicateStatus({
        message: duplicateFailureMessage(built.reason),
        nodeId,
        status: "failed",
      })
      return
    }

    setDuplicateStatus({
      message: "Duplicating selected node.",
      nodeId,
      status: "pending",
    })

    void backendClient.commitMutation(built.request)
      .then((result) => {
        let nextStatus: RuntimeDuplicateMutationStatus = IDLE_DUPLICATE_MUTATION_STATUS

        setEditorState((currentState) => {
          const applied = applyRuntimeBackendMutationCommandResult(currentState, command, result)
          const commandResult = applied.commandResult.result

          nextStatus = commandResult.status === "applied"
            ? {
                message: "Node duplicated.",
                nodeId: applied.state.selection.selectedNodeId ?? nodeId,
                status: "applied",
              }
            : {
                message: commandResult.status === "rejected"
                  ? duplicateFailureMessage(commandResult.reason)
                  : "Duplicate failed.",
                nodeId,
                status: "failed",
              }

          editorStateRef.current = applied.state
          return applied.state
        })

        setDuplicateStatus(nextStatus)
      })
      .catch(() => {
        setDuplicateStatus({
          message: "Backend unavailable.",
          nodeId,
          status: "failed",
        })
      })
  }, [backendClient, setEditorState])

  return {
    duplicateNode,
    duplicateStatus,
  }
}
