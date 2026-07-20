import { describe, expect, it } from "vitest"
import {
  projectExactPreviewLifecycle,
  type ExactPreviewLifecycleModel,
} from "../editor/preview/exactPreviewLifecycle"

function model(
  overrides: Partial<ExactPreviewLifecycleModel> = {},
): ExactPreviewLifecycleModel {
  return {
    activity: "idle",
    error: null,
    operationState: null,
    phase: "idle",
    stale: false,
    ...overrides,
  }
}

describe("PDF-EXPORT-REALDOC-E.5.8 exact preview lifecycle", () => {
  it("projects reload reconciliation as an honest busy state", () => {
    expect(projectExactPreviewLifecycle(model({
      activity: "reconnecting",
      phase: "requesting",
    }))).toMatchObject({
      busy: true,
      canCancel: false,
      canDownload: false,
      canRetry: false,
      statusLabel: "Reconnecting exact preview",
    })
  })

  it("keeps context-changing actions locked while an operation can still be cancelled", () => {
    expect(projectExactPreviewLifecycle(model({
      operationState: "processing",
      phase: "running",
    }))).toMatchObject({
      canCancel: true,
      canChangeTarget: false,
      canDownload: false,
      canRetry: false,
      statusLabel: "Generating exact PDF",
    })
  })

  it("offers the matching retry without hiding a still-running operation", () => {
    expect(projectExactPreviewLifecycle(model({
      error: "status-unavailable",
      operationState: "processing",
      phase: "running",
    }))).toMatchObject({
      canCancel: true,
      canRetry: true,
      retryLabel: "Retry status",
      statusLabel: "PDF status is temporarily unavailable",
    })

    expect(projectExactPreviewLifecycle(model({
      error: "cancel-failed",
      operationState: "processing",
      phase: "running",
    }))).toMatchObject({
      canCancel: false,
      canRetry: true,
      retryLabel: "Retry cancel",
    })
  })

  it("separates completed download retry from generation retry", () => {
    expect(projectExactPreviewLifecycle(model({
      error: "download-failed",
      operationState: "completed",
      phase: "completed",
    }))).toMatchObject({
      canDownload: true,
      canRetry: false,
      statusLabel: "PDF download could not be completed",
    })
  })

  it("does not expose a stale artifact or stale retry", () => {
    expect(projectExactPreviewLifecycle(model({
      operationState: "completed",
      phase: "completed",
      stale: true,
    }))).toMatchObject({
      canDownload: false,
      canRetry: false,
      statusLabel: "Stale result",
    })
  })
})
