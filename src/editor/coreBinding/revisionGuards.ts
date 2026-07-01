import type { CoreSnapshotEnvelope } from "./coreEnvelope"

export interface CoreDerivedRevisionRef {
  sourceRevision: number
  stale?: boolean
}

export function isCoreDerivedCacheStale(
  cache: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return cache.stale === true || envelope.status !== "fresh" || cache.sourceRevision !== envelope.documentRevision
}
