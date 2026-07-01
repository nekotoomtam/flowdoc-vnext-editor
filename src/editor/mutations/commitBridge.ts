export interface CommitBridgeState {
  latestRequestId: string | null
}

export function createCommitBridgeState(): CommitBridgeState {
  return {
    latestRequestId: null,
  }
}
