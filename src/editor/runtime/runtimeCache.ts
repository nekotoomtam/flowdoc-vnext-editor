export interface RuntimeCache {
  documentRevision: number | null
  lastPacketId: string | null
}

export function createRuntimeCache(): RuntimeCache {
  return {
    documentRevision: null,
    lastPacketId: null,
  }
}
