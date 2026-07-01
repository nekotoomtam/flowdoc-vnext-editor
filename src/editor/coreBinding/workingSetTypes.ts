import type { CoreDiagnosticsSummary } from "../../core/coreTypes"
import type { EditorJobKind, EditorJobStatus } from "../jobs/jobTypes"
import type { CommandCapabilityMirror } from "./capabilityMirror"
import type { CoreSnapshotEnvelope } from "./coreEnvelope"
import type { EditorReadModel } from "./readModel"
import type { RenderProjectionSummary } from "./renderProjectionSummary"

export interface MutationEnvelope {
  baseRevision: number
  createdAt: number
  operationKind: string
  optimistic?: boolean
  reason?: string
  requestId: string
  status: "applied" | "pending" | "rejected" | "stale"
  targetIds: string[]
}

export interface EditorJobEnvelope {
  baseRevision: number
  jobId: string
  kind: EditorJobKind
  status: EditorJobStatus
  targetIds: string[]
}

export interface FrontendCoreWorkingSet {
  capabilities: CommandCapabilityMirror
  diagnostics: CoreDiagnosticsSummary
  envelope: CoreSnapshotEnvelope
  readModel: EditorReadModel
  renderProjection: RenderProjectionSummary | null
}
