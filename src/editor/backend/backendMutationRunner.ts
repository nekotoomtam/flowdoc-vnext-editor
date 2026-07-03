import type { EditorRuntimeState } from "../runtime/editorState"
import {
  applyRuntimeBackendMutationResult,
  type RuntimeBackendMutationApply,
} from "../runtime/runtimeBackendMutation"
import {
  createBackendMutationRequestFromCommand,
  type BackendMutationCommand,
  type CreateBackendMutationRequestOptions,
} from "./backendMutationRequests"
import type {
  BackendMutationRequest,
  BackendMutationResultEnvelope,
  FlowDocBackendClient,
} from "./backendTransport"

export type BackendMutationCommandRun =
  | {
      apply: RuntimeBackendMutationApply
      mutationResult: BackendMutationResultEnvelope
      request: BackendMutationRequest
      status: "completed"
    }
  | {
      reason: string
      status: "blocked"
    }

export async function runBackendMutationCommand(
  state: EditorRuntimeState,
  command: BackendMutationCommand,
  client: Pick<FlowDocBackendClient, "commitMutation">,
  options: CreateBackendMutationRequestOptions = {},
): Promise<BackendMutationCommandRun> {
  const built = createBackendMutationRequestFromCommand(state, command, options)
  if (built.status === "blocked") {
    return built
  }

  const mutationResult = await client.commitMutation(built.request)
  const apply = applyRuntimeBackendMutationResult(state, mutationResult)

  return {
    apply,
    mutationResult,
    request: built.request,
    status: "completed",
  }
}
