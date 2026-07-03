export type RuntimeDuplicateMutationStatusKind = "applied" | "failed" | "idle" | "pending"

export interface RuntimeDuplicateMutationStatus {
  message: string | null
  nodeId: string | null
  status: RuntimeDuplicateMutationStatusKind
}

export const IDLE_DUPLICATE_MUTATION_STATUS: RuntimeDuplicateMutationStatus = {
  message: null,
  nodeId: null,
  status: "idle",
}
