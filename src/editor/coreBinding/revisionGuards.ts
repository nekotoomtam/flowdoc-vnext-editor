import type { CoreSnapshotEnvelope } from "./coreEnvelope"

export interface CoreDerivedRevisionRef {
  documentId: string
  sourceRevision: number
  stale?: boolean
}

export interface CoreDerivedApplyRef extends CoreDerivedRevisionRef {
  baseRevision: number
}

export function isCoreDerivedCacheStale(
  cache: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return getCoreDerivedStaleReason(cache, envelope) !== null
}

export type CoreDerivedStaleReason =
  | "cache-stale"
  | "document-mismatch"
  | "envelope-not-fresh"
  | "revision-mismatch"

export function getCoreDerivedStaleReason(
  cache: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): CoreDerivedStaleReason | null {
  if (cache.stale === true) return "cache-stale"
  if (cache.documentId !== envelope.documentId) return "document-mismatch"
  if (envelope.status !== "fresh") return "envelope-not-fresh"
  if (cache.sourceRevision !== envelope.documentRevision) return "revision-mismatch"

  return null
}

export type CoreDerivedApplyBlockReason = CoreDerivedStaleReason | "base-revision-mismatch"

export function getCoreDerivedApplyBlockReason(
  result: CoreDerivedApplyRef,
  envelope: CoreSnapshotEnvelope,
): CoreDerivedApplyBlockReason | null {
  if (result.baseRevision !== envelope.documentRevision) return "base-revision-mismatch"

  return getCoreDerivedStaleReason(result, envelope)
}

export function canApplyCoreDerivedResult(
  result: CoreDerivedRevisionRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return getCoreDerivedStaleReason(result, envelope) === null
}

export function canApplyCoreDerivedResultToEnvelope(
  result: CoreDerivedApplyRef,
  envelope: CoreSnapshotEnvelope,
): boolean {
  return getCoreDerivedApplyBlockReason(result, envelope) === null
}
