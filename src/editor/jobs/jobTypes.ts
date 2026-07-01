export type EditorJobKind =
  | "diagnostics.refresh"
  | "export.prepare"
  | "layout.exact"
  | "layout.live"
  | "render.projectPages"

export type EditorJobPriority = "background" | "normal" | "visible"

export type EditorJobStatus =
  | "cancelled"
  | "completed"
  | "failed"
  | "queued"
  | "running"
  | "stale"

export interface EditorJobTarget {
  nodeIds?: string[]
  pageIds?: string[]
  visibleRange?: {
    end: number
    start: number
  }
}

export interface EditorJobRequest {
  dedupeKey: string
  kind: EditorJobKind
  priority: EditorJobPriority
  reason: string
  requestRevision: number
  target?: EditorJobTarget
}

export interface EditorJob extends EditorJobRequest {
  createdAt: number
  id: string
  status: EditorJobStatus
}

export interface EditorJobQueueState {
  jobs: EditorJob[]
  revision: number
}
