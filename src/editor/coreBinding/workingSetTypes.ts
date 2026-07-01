import type { CoreDiagnosticsSummary } from "../../core/coreTypes"
import type { HistoryStackState } from "../history/historyTypes"
import type { EditorJobKind, EditorJobStatus } from "../jobs/jobTypes"
import type { PaperModel } from "../paper/paperModel"
import type { ViewportState } from "../viewport/viewportState"
import type { CommandCapabilityMirror } from "./capabilityMirror"
import type { CoreSnapshotEnvelope } from "./coreEnvelope"
import type { EditorReadModel } from "./readModel"
import type { RenderProjectionCache } from "./renderProjectionCache"

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

export interface FrontendRuntimeWorkingSet {
  history: HistoryStackState
  paper: PaperModel
  selectedNodeId: string
  selectionReason: string
  viewport: ViewportState
}

export interface FrontendCoreWorkingSet {
  capabilities: CommandCapabilityMirror
  diagnostics: CoreDiagnosticsSummary
  envelope: CoreSnapshotEnvelope
  pendingJobs: EditorJobEnvelope[]
  pendingMutations: MutationEnvelope[]
  readModel: EditorReadModel
  renderProjection: RenderProjectionCache | null
  runtime: FrontendRuntimeWorkingSet
}
