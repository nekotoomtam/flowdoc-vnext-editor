import type { CoreSnapshotEnvelope } from "./coreEnvelope"

export interface CoreDerivedRevisionRef {
  sourceRevision: number
  stale?: boolean
}

export function isCoreDerivedCacheStale(
  cache: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return getCoreDerivedStaleReason(cache, envelope) !== null
}

export type CoreDerivedStaleReason = "cache-stale" | "envelope-not-fresh" | "revision-mismatch"

export function getCoreDerivedStaleReason(
  cache: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): CoreDerivedStaleReason | null {
  if (cache.stale === true) return "cache-stale"
  if (envelope.status !== "fresh") return "envelope-not-fresh"
  if (cache.sourceRevision !== envelope.documentRevision) return "revision-mismatch"

  return null
}

export function canApplyCoreDerivedResult(
  result: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return getCoreDerivedStaleReason(result, envelope) === null
}
