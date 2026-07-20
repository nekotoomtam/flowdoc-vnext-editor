import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LocalPdfExportClient } from "../editor/pdfExport/localPdfExportTransport"
import type { LocalPdfExportPublicStatus } from "../editor/pdfExport/localPdfExportContracts"
import type { PublishedPreviewAdmissionReceipt, PublishedPreviewContext } from "../editor/preview/publishedPreviewContracts"
import {
  publishedPreviewArtifactUrl,
  type PublishedPreviewClient,
} from "../editor/preview/publishedPreviewTransport"
import { testInputMappingProfileOptionKey } from "../editor/preview/testInputJsonState"
import type { PreviewTestInputInteraction } from "./usePreviewTestInput"

const TERMINAL = new Set<LocalPdfExportPublicStatus["state"]>([
  "completed", "cancelled", "deadline-exceeded", "resource-rejected", "failed",
])

export interface PublishedPreviewGenerationInteraction {
  target: "draft" | "published"
  phase: "idle" | "admitting" | "requesting" | "running" | "completed" | "failed"
  receipt: PublishedPreviewAdmissionReceipt | null
  operation: LocalPdfExportPublicStatus | null
  stale: boolean
  error: "admission-failed" | "operation-failed" | "status-unavailable" | "download-failed" | null
  canGenerate: boolean
  artifactUrl: string | null
  generate: () => void
  download: () => void
}

function selectedProfile(interaction: PreviewTestInputInteraction) {
  const selection = interaction.json.state?.mappingProfile
  if (selection == null) return null
  const key = JSON.stringify([
    selection.mappingProfileId,
    selection.mappingProfileVersion,
    selection.profileFingerprint,
  ])
  return interaction.json.mappingProfiles.find((option) => testInputMappingProfileOptionKey(option) === key)?.profile ?? null
}

export interface ExactPreviewGenerationContext {
  contextFingerprint: string
  authoring: PublishedPreviewContext["authoring"]
  projection: PublishedPreviewContext["projection"]
}

function inputIdentity(
  target: "draft" | "published",
  context: ExactPreviewGenerationContext | null,
  interaction: PreviewTestInputInteraction,
): string | null {
  if (context == null || interaction.mode !== "json" || interaction.json.state == null) return null
  return JSON.stringify([
    target,
    context.contextFingerprint,
    context.authoring.documentId,
    context.authoring.documentRevision,
    context.projection.projectionFingerprint,
    interaction.json.state.revision,
    interaction.json.state.mappingProfile?.profileFingerprint ?? null,
  ])
}

function triggerDownload(blob: Blob, target: "draft" | "published"): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `flowdoc-${target}-preview.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useExactPreviewGeneration(options: {
  target: "draft" | "published"
  context: ExactPreviewGenerationContext | null
  input: PreviewTestInputInteraction
  admitAdaptedJson(input: {
    profile: Parameters<PublishedPreviewClient["admitAdaptedJson"]>[0]["profile"]
    payloadText: string
    idempotencyKey: string
  }): Promise<PublishedPreviewAdmissionReceipt>
  pdfClient: LocalPdfExportClient
  pollIntervalMs?: number
}): PublishedPreviewGenerationInteraction {
  const currentIdentity = inputIdentity(options.target, options.context, options.input)
  const [submittedIdentity, setSubmittedIdentity] = useState<string | null>(null)
  const [phase, setPhase] = useState<PublishedPreviewGenerationInteraction["phase"]>("idle")
  const [receipt, setReceipt] = useState<PublishedPreviewAdmissionReceipt | null>(null)
  const [operation, setOperation] = useState<LocalPdfExportPublicStatus | null>(null)
  const [error, setError] = useState<PublishedPreviewGenerationInteraction["error"]>(null)
  const run = useRef(0)
  const contextIdentity = options.context == null ? null : JSON.stringify([
    options.target,
    options.context.contextFingerprint,
    options.context.authoring.documentId,
    options.context.authoring.documentRevision,
    options.context.projection.projectionFingerprint,
  ])

  useEffect(() => {
    run.current += 1
    setSubmittedIdentity(null)
    setPhase("idle")
    setReceipt(null)
    setOperation(null)
    setError(null)
  }, [contextIdentity])

  const stale = submittedIdentity != null && submittedIdentity !== currentIdentity
  const profile = selectedProfile(options.input)
  const diagnosticsReady = options.input.json.diagnostics?.status === "ready-for-admission"
  const busy = phase === "admitting" || phase === "requesting" || phase === "running"
  const canGenerate = options.context != null
    && options.input.mode === "json"
    && profile != null
    && diagnosticsReady
    && !busy

  const generate = useCallback(() => {
    const context = options.context
    const state = options.input.json.state
    const selected = selectedProfile(options.input)
    const identity = inputIdentity(options.target, context, options.input)
    if (
      context == null
      || state == null
      || selected == null
      || identity == null
      || options.input.json.diagnostics?.status !== "ready-for-admission"
      || busy
    ) return
    const admissionKey = `editor:${options.target}-preview:admission:${crypto.randomUUID()}`
    const exportKey = `editor:${options.target}-preview:artifact:${crypto.randomUUID()}`
    const runId = run.current + 1
    run.current = runId
    setSubmittedIdentity(identity)
    setReceipt(null)
    setOperation(null)
    setError(null)
    setPhase("admitting")
    void (async () => {
      let admitted = false
      try {
        const admission = await options.admitAdaptedJson({
          profile: selected,
          payloadText: state.payloadText,
          idempotencyKey: admissionKey,
        })
        if (run.current !== runId) return
        admitted = true
        setReceipt(admission)
        setPhase("requesting")
        const requested = await options.pdfClient.requestExport({
          documentId: admission.instance.instanceId,
          documentRevision: admission.instance.revision,
        }, exportKey)
        if (run.current !== runId) return
        setOperation(requested)
        setPhase(requested.state === "completed" ? "completed" : TERMINAL.has(requested.state) ? "failed" : "running")
        if (requested.state !== "completed" && TERMINAL.has(requested.state)) setError("operation-failed")
      } catch {
        if (run.current === runId) {
          setError(admitted ? "operation-failed" : "admission-failed")
          setPhase("failed")
        }
      }
    })()
  }, [busy, options.admitAdaptedJson, options.context, options.input, options.pdfClient, options.target])

  const operationId = operation?.operationId ?? null
  const operationState = operation?.state ?? null
  useEffect(() => {
    if (operationId == null || operationState == null || TERMINAL.has(operationState)) return
    let cancelled = false
    let timer: number | null = null
    const schedule = () => {
      timer = window.setTimeout(() => {
        void options.pdfClient.readStatus(operationId).then((status) => {
          if (cancelled || status.operationId !== operationId) return
          setOperation(status)
          if (status.state === "completed") setPhase("completed")
          else if (TERMINAL.has(status.state)) {
            setPhase("failed")
            setError("operation-failed")
          }
          else schedule()
        }).catch(() => {
          if (!cancelled) {
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
  }, [operationId, operationState, options.pdfClient, options.pollIntervalMs])

  const download = useCallback(() => {
    if (operation?.state !== "completed" || stale) return
    void options.pdfClient.downloadExport(operation.operationId)
      .then((blob) => triggerDownload(blob, options.target))
      .catch(() => setError("download-failed"))
  }, [operation, options.pdfClient, options.target, stale])

  const artifactUrl = useMemo(() => (
    operation?.state === "completed" && !stale ? publishedPreviewArtifactUrl(operation.operationId) : null
  ), [operation, stale])

  return { target: options.target, phase, receipt, operation, stale, error, canGenerate, artifactUrl, generate, download }
}

export function usePublishedPreviewGeneration(options: {
  context: PublishedPreviewContext | null
  input: PreviewTestInputInteraction
  client: PublishedPreviewClient
  pdfClient: LocalPdfExportClient
  pollIntervalMs?: number
}): PublishedPreviewGenerationInteraction {
  const admitAdaptedJson = useCallback((input: {
    profile: Parameters<PublishedPreviewClient["admitAdaptedJson"]>[0]["profile"]
    payloadText: string
    idempotencyKey: string
  }) => {
    if (options.context == null) return Promise.reject(new Error("Published Preview context is unavailable"))
    return options.client.admitAdaptedJson({ ...input, context: options.context })
  }, [options.client, options.context])
  return useExactPreviewGeneration({
    target: "published",
    context: options.context,
    input: options.input,
    admitAdaptedJson,
    pdfClient: options.pdfClient,
    ...(options.pollIntervalMs == null ? {} : { pollIntervalMs: options.pollIntervalMs }),
  })
}
