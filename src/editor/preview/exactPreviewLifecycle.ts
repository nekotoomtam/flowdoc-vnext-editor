import type { LocalPdfExportPublicState } from "../pdfExport/localPdfExportContracts"

export type ExactPreviewPhase =
  | "idle"
  | "admitting"
  | "requesting"
  | "running"
  | "completed"
  | "cancelled"
  | "failed"

export type ExactPreviewActivity =
  | "idle"
  | "admitting"
  | "requesting"
  | "refreshing"
  | "cancelling"
  | "downloading"

export type ExactPreviewError =
  | "admission-failed"
  | "operation-failed"
  | "operation-mismatch"
  | "status-unavailable"
  | "cancel-failed"
  | "download-failed"

export interface ExactPreviewLifecycleModel {
  activity: ExactPreviewActivity
  error: ExactPreviewError | null
  operationState: LocalPdfExportPublicState | null
  phase: ExactPreviewPhase
  stale: boolean
}

export interface ExactPreviewLifecycleProjection {
  busy: boolean
  canCancel: boolean
  canChangeTarget: boolean
  canDownload: boolean
  canRetry: boolean
  retryLabel: string
  statusLabel: string
}

const ACTIVE_CANCELLABLE_STATES = new Set<LocalPdfExportPublicState>([
  "accepted",
  "pending",
  "processing",
])

const ACTIVE_STATES = new Set<LocalPdfExportPublicState>([
  ...ACTIVE_CANCELLABLE_STATES,
  "finalizing",
  "cancel-requested",
])

const OPERATION_STATUS_LABELS: Record<LocalPdfExportPublicState, string> = {
  accepted: "PDF request accepted",
  pending: "Waiting to generate PDF",
  processing: "Generating exact PDF",
  finalizing: "Finalizing exact PDF",
  completed: "Exact PDF ready",
  "cancel-requested": "Cancelling PDF",
  cancelled: "PDF generation cancelled",
  "deadline-exceeded": "PDF generation timed out",
  "resource-rejected": "PDF exceeded the local resource limit",
  failed: "PDF generation failed",
}

const ERROR_STATUS_LABELS: Record<ExactPreviewError, string> = {
  "admission-failed": "Mapping or validation could not be completed",
  "operation-failed": "PDF generation could not be completed",
  "operation-mismatch": "PDF status did not match this preview",
  "status-unavailable": "PDF status is temporarily unavailable",
  "cancel-failed": "PDF cancellation could not be completed",
  "download-failed": "PDF download could not be completed",
}

function statusLabel(model: ExactPreviewLifecycleModel): string {
  if (model.activity === "admitting") return "Mapping and validating"
  if (model.activity === "requesting") return "Preparing PDF operation"
  if (model.activity === "refreshing") return "Refreshing PDF status"
  if (model.activity === "cancelling") return "Cancelling PDF"
  if (model.activity === "downloading") return "Downloading exact PDF"
  if (model.stale) return "Stale result"
  if (model.error != null) return ERROR_STATUS_LABELS[model.error]
  if (model.operationState != null) return OPERATION_STATUS_LABELS[model.operationState]
  if (model.phase === "idle") return "Exact preview not generated"
  if (model.phase === "completed") return "Exact PDF ready"
  if (model.phase === "cancelled") return "PDF generation cancelled"
  if (model.phase === "failed") return "Preview failed"
  return "Preparing exact preview"
}

export function projectExactPreviewLifecycle(
  model: ExactPreviewLifecycleModel,
): ExactPreviewLifecycleProjection {
  const busy = model.activity !== "idle"
  const activeOperation = model.operationState != null && ACTIVE_STATES.has(model.operationState)
  const canCancel = !busy
    && model.error !== "cancel-failed"
    && model.operationState != null
    && ACTIVE_CANCELLABLE_STATES.has(model.operationState)
  const canDownload = !busy
    && !model.stale
    && model.operationState === "completed"
  const canRetry = !busy && !model.stale && (
    model.error === "admission-failed"
    || model.error === "operation-failed"
    || model.error === "operation-mismatch"
    || model.error === "status-unavailable"
    || model.error === "cancel-failed"
    || model.phase === "cancelled"
  )
  const retryLabel = model.error === "cancel-failed"
    ? "Retry cancel"
    : model.error === "status-unavailable" || model.error === "operation-mismatch"
      ? "Retry status"
      : "Retry preview"

  return {
    busy,
    canCancel,
    canChangeTarget: !busy && !activeOperation,
    canDownload,
    canRetry,
    retryLabel,
    statusLabel: statusLabel(model),
  }
}
