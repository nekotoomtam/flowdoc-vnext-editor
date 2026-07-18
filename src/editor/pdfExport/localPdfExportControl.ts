import type {
  LocalPdfExportEligibilityStatus,
  LocalPdfExportPublicStatus,
} from "./localPdfExportContracts"

export type LocalPdfExportEligibilityState = "checking" | LocalPdfExportEligibilityStatus | "unavailable"
export type LocalPdfExportActivity = "idle" | "requesting" | "cancelling" | "downloading"
export type LocalPdfExportAction = "check-eligibility" | "request" | "cancel" | "download" | null
export type LocalPdfExportError =
  | "eligibility-pin-mismatch"
  | "eligibility-unavailable"
  | "status-pin-mismatch"
  | "status-unavailable"
  | "request-pin-mismatch"
  | "request-failed"
  | "cancel-failed"
  | "download-failed"

export interface LocalPdfExportModel {
  activity: LocalPdfExportActivity
  eligibility: LocalPdfExportEligibilityState
  error: LocalPdfExportError | null
  operation: LocalPdfExportPublicStatus | null
}

export interface LocalPdfExportControl {
  action: LocalPdfExportAction
  disabled: boolean
  label: string
  statusLabel: string
}

const STATUS_LABELS: Record<LocalPdfExportPublicStatus["state"], string> = {
  accepted: "PDF: Accepted",
  pending: "PDF: Pending",
  processing: "PDF: Processing",
  finalizing: "PDF: Finalizing",
  completed: "PDF: Ready",
  "cancel-requested": "PDF: Cancelling",
  cancelled: "PDF: Cancelled",
  "deadline-exceeded": "PDF: Timed out",
  "resource-rejected": "PDF: Resource blocked",
  failed: "PDF: Failed",
}

export function projectLocalPdfExportControl(model: LocalPdfExportModel): LocalPdfExportControl {
  if (model.activity === "requesting") return {
    action: null,
    disabled: true,
    label: "Requesting PDF",
    statusLabel: "PDF: Requesting",
  }
  if (model.activity === "cancelling") return {
    action: null,
    disabled: true,
    label: "Cancelling PDF",
    statusLabel: "PDF: Cancelling",
  }
  if (model.activity === "downloading") return {
    action: null,
    disabled: true,
    label: "Downloading PDF",
    statusLabel: "PDF: Downloading",
  }
  if (model.eligibility === "checking") return {
    action: null,
    disabled: true,
    label: "Checking PDF",
    statusLabel: "PDF: Checking",
  }
  if (model.eligibility === "ineligible") return {
    action: null,
    disabled: true,
    label: "PDF unavailable",
    statusLabel: "PDF: Unsupported document",
  }
  if (model.eligibility === "stale") return {
    action: null,
    disabled: true,
    label: "Revision changed",
    statusLabel: "PDF: Revision changed",
  }
  if (model.eligibility === "unavailable") return {
    action: "check-eligibility",
    disabled: false,
    label: "Retry PDF check",
    statusLabel: "PDF: Local service unavailable",
  }
  const operation = model.operation
  if (operation == null) return {
    action: "request",
    disabled: false,
    label: model.error == null ? "Export PDF" : "Retry PDF",
    statusLabel: model.error == null ? "PDF: Ready" : "PDF: Request failed",
  }
  if (operation.state === "completed") return {
    action: "download",
    disabled: false,
    label: model.error == null ? "Download PDF" : "Retry download",
    statusLabel: model.error == null ? STATUS_LABELS.completed : "PDF: Download failed",
  }
  if (operation.state === "accepted" || operation.state === "pending" || operation.state === "processing") {
    return {
      action: "cancel",
      disabled: false,
      label: model.error === "cancel-failed" ? "Retry cancel" : "Cancel PDF",
      statusLabel: model.error === "cancel-failed"
        ? "PDF: Cancel failed"
        : model.error === "status-unavailable"
          ? "PDF: Status unavailable"
          : STATUS_LABELS[operation.state],
    }
  }
  if (operation.state === "finalizing" || operation.state === "cancel-requested") return {
    action: null,
    disabled: true,
    label: operation.state === "finalizing" ? "Finalizing PDF" : "Cancelling PDF",
    statusLabel: model.error === "status-unavailable"
      ? "PDF: Status unavailable"
      : STATUS_LABELS[operation.state],
  }
  return {
    action: "request",
    disabled: false,
    label: "Retry PDF",
    statusLabel: STATUS_LABELS[operation.state],
  }
}
