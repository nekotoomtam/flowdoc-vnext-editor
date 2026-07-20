import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  isLocalPdfExportStatusForPin,
  type LocalPdfExportPublicStatus,
} from "../editor/pdfExport/localPdfExportContracts"
import type { LocalPdfExportClient } from "../editor/pdfExport/localPdfExportTransport"
import {
  projectExactPreviewLifecycle,
  type ExactPreviewActivity,
  type ExactPreviewError,
  type ExactPreviewLifecycleProjection,
  type ExactPreviewPhase,
} from "../editor/preview/exactPreviewLifecycle"
import type {
  PublishedPreviewAdmissionReceipt,
  PublishedPreviewContext,
} from "../editor/preview/publishedPreviewContracts"
import {
  publishedPreviewArtifactUrl,
  type PublishedPreviewClient,
} from "../editor/preview/publishedPreviewTransport"
import { testInputMappingProfileOptionKey } from "../editor/preview/testInputJsonState"
import type { PreviewTestInputInteraction } from "./usePreviewTestInput"

const TERMINAL = new Set<LocalPdfExportPublicStatus["state"]>([
  "completed", "cancelled", "deadline-exceeded", "resource-rejected", "failed",
])
const CANCELLABLE = new Set<LocalPdfExportPublicStatus["state"]>([
  "accepted", "pending", "processing",
])

type PreviewTarget = "draft" | "published"
type PreviewMappingProfile = Parameters<PublishedPreviewClient["admitAdaptedJson"]>[0]["profile"]
type PreviewCanonicalForm = Pick<
  Parameters<PublishedPreviewClient["admitCanonicalForm"]>[0],
  "data" | "collections"
>

interface PreviewAttempt {
  admissionKey: string
  cancelKey: string | null
  exportKey: string
  identity: string
  input:
    | ({ kind: "canonical-data" } & PreviewCanonicalForm)
    | { kind: "adapted-json"; payloadText: string; profile: PreviewMappingProfile }
  receipt: PublishedPreviewAdmissionReceipt | null
}

export interface PublishedPreviewGenerationInteraction {
  target: "draft" | "published"
  phase: ExactPreviewPhase
  activity: ExactPreviewActivity
  receipt: PublishedPreviewAdmissionReceipt | null
  operation: LocalPdfExportPublicStatus | null
  stale: boolean
  error: ExactPreviewError | null
  lifecycle: ExactPreviewLifecycleProjection
  canGenerate: boolean
  artifactUrl: string | null
  generate: () => void
  cancel: () => void
  retry: () => void
  download: () => void
}

function selectedProfile(interaction: PreviewTestInputInteraction): PreviewMappingProfile | null {
  const selection = interaction.json.state?.mappingProfile
  if (selection == null) return null
  const key = JSON.stringify([
    selection.mappingProfileId,
    selection.mappingProfileVersion,
    selection.profileFingerprint,
  ])
  return interaction.json.mappingProfiles.find((option) => (
    testInputMappingProfileOptionKey(option) === key
  ))?.profile ?? null
}

export interface ExactPreviewGenerationContext {
  contextFingerprint: string
  authoring: PublishedPreviewContext["authoring"]
  projection: PublishedPreviewContext["projection"]
}

function inputIdentity(
  target: PreviewTarget,
  context: ExactPreviewGenerationContext | null,
  interaction: PreviewTestInputInteraction,
): string | null {
  if (context == null) return null
  if (interaction.mode === "form") {
    if (interaction.form.state == null || interaction.form.candidate?.status !== "ready-for-admission") return null
    return JSON.stringify([
      target,
      "canonical-data",
      context.contextFingerprint,
      context.authoring.documentId,
      context.authoring.documentRevision,
      context.projection.projectionFingerprint,
      interaction.form.state.revision,
    ])
  }
  if (interaction.json.state == null) return null
  return JSON.stringify([
    target,
    "adapted-json",
    context.contextFingerprint,
    context.authoring.documentId,
    context.authoring.documentRevision,
    context.projection.projectionFingerprint,
    interaction.json.state.revision,
    interaction.json.state.mappingProfile?.profileFingerprint ?? null,
  ])
}

function triggerDownload(blob: Blob, target: PreviewTarget): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `flowdoc-${target}-preview.pdf`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function phaseForOperation(status: LocalPdfExportPublicStatus): ExactPreviewPhase {
  if (status.state === "completed") return "completed"
  if (status.state === "cancelled") return "cancelled"
  if (TERMINAL.has(status.state)) return "failed"
  return "running"
}

export function useExactPreviewGeneration(options: {
  target: PreviewTarget
  context: ExactPreviewGenerationContext | null
  input: PreviewTestInputInteraction
  admitAdaptedJson(input: {
    profile: PreviewMappingProfile
    payloadText: string
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
  admitCanonicalForm(input: PreviewCanonicalForm & {
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
  pdfClient: LocalPdfExportClient
  pollIntervalMs?: number
}): PublishedPreviewGenerationInteraction {
  const currentIdentity = inputIdentity(options.target, options.context, options.input)
  const [submittedIdentity, setSubmittedIdentity] = useState<string | null>(null)
  const [phase, setPhase] = useState<ExactPreviewPhase>("idle")
  const [activity, setActivity] = useState<ExactPreviewActivity>("idle")
  const [receipt, setReceipt] = useState<PublishedPreviewAdmissionReceipt | null>(null)
  const [operation, setOperation] = useState<LocalPdfExportPublicStatus | null>(null)
  const [error, setError] = useState<ExactPreviewError | null>(null)
  const run = useRef(0)
  const attemptRef = useRef<PreviewAttempt | null>(null)
  const contextIdentity = options.context == null ? null : JSON.stringify([
    options.target,
    options.context.contextFingerprint,
    options.context.authoring.documentId,
    options.context.authoring.documentRevision,
    options.context.projection.projectionFingerprint,
  ])

  useEffect(() => {
    run.current += 1
    attemptRef.current = null
    setSubmittedIdentity(null)
    setPhase("idle")
    setActivity("idle")
    setReceipt(null)
    setOperation(null)
    setError(null)
  }, [contextIdentity])

  const stale = submittedIdentity != null && submittedIdentity !== currentIdentity
  const lifecycle = useMemo(() => projectExactPreviewLifecycle({
    activity,
    error,
    operationState: operation?.state ?? null,
    phase,
    stale,
  }), [activity, error, operation?.state, phase, stale])
  const profile = selectedProfile(options.input)
  const diagnosticsReady = options.input.json.diagnostics?.status === "ready-for-admission"
  const formReady = options.input.form.candidate?.status === "ready-for-admission"
  const canGenerate = options.context != null
    && (options.input.mode === "form" ? formReady : profile != null && diagnosticsReady)
    && lifecycle.canChangeTarget
    && !lifecycle.canRetry

  const applyStatus = useCallback((
    status: LocalPdfExportPublicStatus,
    runId: number,
    expectedOperationId: string | null,
  ): boolean => {
    const attempt = attemptRef.current
    if (run.current !== runId || attempt?.receipt == null) return false
    const pin = {
      documentId: attempt.receipt.instance.instanceId,
      documentRevision: attempt.receipt.instance.revision,
    }
    if (
      expectedOperationId != null && status.operationId !== expectedOperationId
      || !isLocalPdfExportStatusForPin(status, pin)
    ) {
      setActivity("idle")
      setError("operation-mismatch")
      setPhase("failed")
      return false
    }
    setOperation(status)
    setActivity("idle")
    setPhase(phaseForOperation(status))
    setError(TERMINAL.has(status.state) && status.state !== "completed" && status.state !== "cancelled"
      ? "operation-failed"
      : null)
    return true
  }, [])

  const requestAttempt = useCallback(async (attempt: PreviewAttempt, runId: number) => {
    if (attempt.receipt == null || run.current !== runId) return
    setPhase("requesting")
    setActivity("requesting")
    setError(null)
    try {
      const requested = await options.pdfClient.requestExport({
        documentId: attempt.receipt.instance.instanceId,
        documentRevision: attempt.receipt.instance.revision,
      }, attempt.exportKey)
      applyStatus(requested, runId, null)
    } catch {
      if (run.current !== runId) return
      setActivity("idle")
      setError("operation-failed")
      setPhase("failed")
    }
  }, [applyStatus, options.pdfClient])

  const admitAttempt = useCallback(async (attempt: PreviewAttempt, runId: number) => {
    if (run.current !== runId) return
    setPhase("admitting")
    setActivity("admitting")
    setError(null)
    try {
      const admission = attempt.input.kind === "canonical-data"
        ? await options.admitCanonicalForm({
            data: attempt.input.data,
            collections: attempt.input.collections,
            idempotencyKey: attempt.admissionKey,
          })
        : await options.admitAdaptedJson({
            profile: attempt.input.profile,
            payloadText: attempt.input.payloadText,
            idempotencyKey: attempt.admissionKey,
          })
      if (run.current !== runId || attemptRef.current !== attempt) return
      attempt.receipt = admission
      setReceipt(admission)
      await requestAttempt(attempt, runId)
    } catch {
      if (run.current !== runId) return
      setActivity("idle")
      setError("admission-failed")
      setPhase("failed")
    }
  }, [options.admitAdaptedJson, options.admitCanonicalForm, requestAttempt])

  const generate = useCallback(() => {
    const context = options.context
    const identity = inputIdentity(options.target, context, options.input)
    if (context == null || identity == null || !lifecycle.canChangeTarget) return
    const canonical = options.input.form.candidate
    const jsonState = options.input.json.state
    const selected = selectedProfile(options.input)
    const attemptInput: PreviewAttempt["input"] | null = options.input.mode === "form"
      ? canonical?.status === "ready-for-admission"
        ? { kind: "canonical-data", data: canonical.data, collections: canonical.collections }
        : null
      : jsonState != null
        && selected != null
        && options.input.json.diagnostics?.status === "ready-for-admission"
        ? { kind: "adapted-json", payloadText: jsonState.payloadText, profile: selected }
        : null
    if (attemptInput == null) return
    const attempt: PreviewAttempt = {
      admissionKey: `editor:${options.target}-preview:admission:${crypto.randomUUID()}`,
      cancelKey: null,
      exportKey: `editor:${options.target}-preview:artifact:${crypto.randomUUID()}`,
      identity,
      input: attemptInput,
      receipt: null,
    }
    const runId = run.current + 1
    run.current = runId
    attemptRef.current = attempt
    setSubmittedIdentity(identity)
    setReceipt(null)
    setOperation(null)
    setError(null)
    void admitAttempt(attempt, runId)
  }, [admitAttempt, lifecycle.canChangeTarget, options.context, options.input, options.target])

  const operationId = operation?.operationId ?? null
  const operationState = operation?.state ?? null
  useEffect(() => {
    if (
      activity !== "idle"
      || operationId == null
      || operationState == null
      || TERMINAL.has(operationState)
    ) return
    let cancelled = false
    let timer: number | null = null
    const runId = run.current
    const schedule = () => {
      timer = window.setTimeout(() => {
        void options.pdfClient.readStatus(operationId).then((status) => {
          if (cancelled) return
          if (applyStatus(status, runId, operationId) && !TERMINAL.has(status.state)) schedule()
        }).catch(() => {
          if (!cancelled && run.current === runId) {
            setError("status-unavailable")
            schedule()
          }
        })
      }, options.pollIntervalMs ?? 750)
    }
    schedule()
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [activity, applyStatus, operationId, operationState, options.pdfClient, options.pollIntervalMs])

  const refreshStatus = useCallback(() => {
    if (operation == null || activity !== "idle") return
    const runId = run.current
    setActivity("refreshing")
    setError(null)
    void options.pdfClient.readStatus(operation.operationId)
      .then((status) => applyStatus(status, runId, operation.operationId))
      .catch(() => {
        if (run.current !== runId) return
        setActivity("idle")
        setError("status-unavailable")
      })
  }, [activity, applyStatus, operation, options.pdfClient])

  const cancel = useCallback(() => {
    const attempt = attemptRef.current
    if (
      operation == null
      || attempt == null
      || activity !== "idle"
      || !CANCELLABLE.has(operation.state)
    ) return
    attempt.cancelKey ??= `editor:${options.target}-preview:cancel:${crypto.randomUUID()}`
    const runId = run.current
    setActivity("cancelling")
    setError(null)
    void options.pdfClient.cancelExport(operation.operationId, attempt.cancelKey)
      .then((result) => {
        if (run.current !== runId || result.operationId !== operation.operationId) return
        setOperation((current) => current == null ? null : { ...current, state: result.state })
        setActivity("idle")
        setError(null)
        setPhase(result.state === "cancelled" ? "cancelled" : "running")
      })
      .catch(() => {
        if (run.current !== runId) return
        setActivity("idle")
        setError("cancel-failed")
      })
  }, [activity, operation, options.pdfClient, options.target])

  const download = useCallback(() => {
    if (operation?.state !== "completed" || stale || activity !== "idle") return
    const runId = run.current
    setActivity("downloading")
    setError(null)
    void options.pdfClient.downloadExport(operation.operationId)
      .then((blob) => {
        if (run.current !== runId) return
        triggerDownload(blob, options.target)
        setActivity("idle")
        setError(null)
      })
      .catch(() => {
        if (run.current !== runId) return
        setActivity("idle")
        setError("download-failed")
      })
  }, [activity, operation, options.pdfClient, options.target, stale])

  const retry = useCallback(() => {
    const attempt = attemptRef.current
    if (activity !== "idle" || stale || attempt == null) return
    if (error === "cancel-failed") {
      cancel()
      return
    }
    if ((error === "status-unavailable" || error === "operation-mismatch") && operation != null) {
      refreshStatus()
      return
    }
    if (operation != null && TERMINAL.has(operation.state)) {
      generate()
      return
    }
    if (attempt.receipt == null) {
      void admitAttempt(attempt, run.current)
      return
    }
    if (operation == null) void requestAttempt(attempt, run.current)
  }, [activity, admitAttempt, cancel, error, generate, operation, refreshStatus, requestAttempt, stale])

  const artifactUrl = useMemo(() => (
    operation?.state === "completed" && !stale
      ? publishedPreviewArtifactUrl(operation.operationId)
      : null
  ), [operation, stale])

  return {
    target: options.target,
    phase,
    activity,
    receipt,
    operation,
    stale,
    error,
    lifecycle,
    canGenerate,
    artifactUrl,
    generate,
    cancel,
    retry,
    download,
  }
}

export function usePublishedPreviewGeneration(options: {
  context: PublishedPreviewContext | null
  input: PreviewTestInputInteraction
  client: PublishedPreviewClient
  pdfClient: LocalPdfExportClient
  pollIntervalMs?: number
}): PublishedPreviewGenerationInteraction {
  const admitAdaptedJson = useCallback((input: {
    profile: PreviewMappingProfile
    payloadText: string
    idempotencyKey: string
  }) => {
    if (options.context == null) return Promise.reject(new Error("Published Preview context is unavailable"))
    return options.client.admitAdaptedJson({ ...input, context: options.context })
  }, [options.client, options.context])
  const admitCanonicalForm = useCallback((input: PreviewCanonicalForm & { idempotencyKey: string }) => {
    if (options.context == null) return Promise.reject(new Error("Published Preview context is unavailable"))
    return options.client.admitCanonicalForm({ ...input, context: options.context })
  }, [options.client, options.context])
  return useExactPreviewGeneration({
    target: "published",
    context: options.context,
    input: options.input,
    admitAdaptedJson,
    admitCanonicalForm,
    pdfClient: options.pdfClient,
    ...(options.pollIntervalMs == null ? {} : { pollIntervalMs: options.pollIntervalMs }),
  })
}
