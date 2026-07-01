export interface MutationQueueState {
  pendingCount: number
}

export function createMutationQueueState(): MutationQueueState {
  return {
    pendingCount: 0,
  }
}
