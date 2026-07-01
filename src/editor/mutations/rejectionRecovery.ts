export interface RejectionRecoveryState {
  latestReason: string | null
}

export function createRejectionRecoveryState(): RejectionRecoveryState {
  return {
    latestReason: null,
  }
}
