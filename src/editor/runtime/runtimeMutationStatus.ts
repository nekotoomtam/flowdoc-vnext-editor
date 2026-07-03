import type { BackendMutationCommand } from "../backend/backendMutationRequests"

export type RuntimeNodeMutationStatusKind = "applied" | "failed" | "idle" | "pending"

export interface RuntimeNodeMutationStatus {
  command: BackendMutationCommand["kind"] | null
  message: string | null
  nodeId: string | null
  status: RuntimeNodeMutationStatusKind
}

export const IDLE_NODE_MUTATION_STATUS: RuntimeNodeMutationStatus = {
  command: null,
  message: null,
  nodeId: null,
  status: "idle",
}
