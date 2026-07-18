import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  isLocalPdfExportStatusForPin,
  localPdfExportPinKey,
  type LocalPdfExportDocumentPin,
  type LocalPdfExportPublicStatus,
} from "../editor/pdfExport/localPdfExportContracts"
import {
  projectLocalPdfExportControl,
  type LocalPdfExportControl,
  type LocalPdfExportModel,
} from "../editor/pdfExport/localPdfExportControl"
import type { LocalPdfExportClient } from "../editor/pdfExport/localPdfExportTransport"

const TERMINAL_STATES = new Set<LocalPdfExportPublicStatus["state"]>([
  "completed",
  "cancelled",
  "deadline-exceeded",
  "resource-rejected",
  "failed",
])

function initialModel(): LocalPdfExportModel {
  return { activity: "idle", eligibility: "checking", error: null, operation: null }
}

function createIdempotencyKey(kind: "request" | "cancel"): string {
  return `flowdoc-editor-pdf-${kind}:${crypto.randomUUID()}`
}

function triggerDownload(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "flowdoc-export.pdf"
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface LocalPdfExportInteraction {
  activate: () => void
  control: LocalPdfExportControl
  operation: LocalPdfExportPublicStatus | null
}

export function useLocalPdfExport(options: {
  client: LocalPdfExportClient
  enabled?: boolean
  pin: LocalPdfExportDocumentPin
  pollIntervalMs?: number
}): LocalPdfExportInteraction {
  const { client, pin } = options
  const enabled = options.enabled ?? true
  const pollIntervalMs = options.pollIntervalMs ?? 1_000
  const pinKey = localPdfExportPinKey(pin)
  const currentPinKey = useRef(pinKey)
  const requestKey = useRef<string | null>(null)
  const cancelKey = useRef<string | null>(null)
  const [eligibilityAttempt, setEligibilityAttempt] = useState(0)
  const [model, setModel] = useState<LocalPdfExportModel>(initialModel)

  useEffect(() => {
    currentPinKey.current = pinKey
    requestKey.current = null
    cancelKey.current = null
    setModel(initialModel())
    let cancelled = false

    if (!enabled) {
      setModel({ activity: "idle", eligibility: "ineligible", error: null, operation: null })
      return () => {
        cancelled = true
      }
    }

    void client.checkEligibility(pin)
      .then((eligibility) => {
        if (cancelled || currentPinKey.current !== pinKey) return
        if (eligibility.documentId !== pin.documentId || eligibility.documentRevision !== pin.documentRevision) {
          setModel({ activity: "idle", eligibility: "unavailable", error: "eligibility-pin-mismatch", operation: null })
          return
        }
        setModel({ activity: "idle", eligibility: eligibility.status, error: null, operation: null })
      })
      .catch(() => {
        if (!cancelled && currentPinKey.current === pinKey) {
          setModel({ activity: "idle", eligibility: "unavailable", error: "eligibility-unavailable", operation: null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [client, eligibilityAttempt, enabled, pin.documentId, pin.documentRevision, pinKey])

  const operationId = model.operation?.operationId ?? null
  const operationState = model.operation?.state ?? null
  useEffect(() => {
    if (operationId == null || operationState == null || TERMINAL_STATES.has(operationState)) return
    let cancelled = false
    let timer: number | null = null
    const schedule = () => {
      timer = window.setTimeout(() => {
        void client.readStatus(operationId)
          .then((status) => {
            if (cancelled || currentPinKey.current !== pinKey) return
            if (status.operationId !== operationId || !isLocalPdfExportStatusForPin(status, pin)) {
              setModel({ activity: "idle", eligibility: "stale", error: "status-pin-mismatch", operation: null })
              return
            }
            setModel((current) => ({ ...current, error: null, operation: status }))
            if (!TERMINAL_STATES.has(status.state)) schedule()
          })
          .catch(() => {
            if (!cancelled && currentPinKey.current === pinKey) {
              setModel((current) => ({ ...current, error: "status-unavailable" }))
              schedule()
            }
          })
      }, pollIntervalMs)
    }
    schedule()
    return () => {
      cancelled = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [client, operationId, operationState, pin.documentId, pin.documentRevision, pinKey, pollIntervalMs])

  const requestExport = useCallback(() => {
    if (model.eligibility !== "eligible" || model.activity !== "idle") return
    const newIntent = model.operation != null
    if (newIntent) {
      requestKey.current = null
      cancelKey.current = null
    }
    requestKey.current ??= createIdempotencyKey("request")
    const idempotencyKey = requestKey.current
    const requestedPinKey = pinKey
    setModel((current) => ({ ...current, activity: "requesting", error: null, operation: newIntent ? null : current.operation }))
    void client.requestExport(pin, idempotencyKey)
      .then((status) => {
        if (currentPinKey.current !== requestedPinKey) return
        if (!isLocalPdfExportStatusForPin(status, pin)) {
          setModel({ activity: "idle", eligibility: "stale", error: "request-pin-mismatch", operation: null })
          return
        }
        setModel((current) => ({ ...current, activity: "idle", error: null, operation: status }))
      })
      .catch(() => {
        if (currentPinKey.current === requestedPinKey) {
          setModel((current) => ({ ...current, activity: "idle", error: "request-failed" }))
        }
      })
  }, [client, model.activity, model.eligibility, model.operation, pin, pinKey])

  const cancelExport = useCallback(() => {
    const operation = model.operation
    if (operation == null || model.activity !== "idle") return
    cancelKey.current ??= createIdempotencyKey("cancel")
    const idempotencyKey = cancelKey.current
    const requestedPinKey = pinKey
    setModel((current) => ({ ...current, activity: "cancelling", error: null }))
    void client.cancelExport(operation.operationId, idempotencyKey)
      .then((result) => {
        if (currentPinKey.current !== requestedPinKey || result.operationId !== operation.operationId) return
        setModel((current) => ({
          ...current,
          activity: "idle",
          error: null,
          operation: current.operation == null ? null : { ...current.operation, state: result.state },
        }))
      })
      .catch(() => {
        if (currentPinKey.current === requestedPinKey) {
          setModel((current) => ({ ...current, activity: "idle", error: "cancel-failed" }))
        }
      })
  }, [client, model.activity, model.operation, pinKey])

  const downloadExport = useCallback(() => {
    const operation = model.operation
    if (operation?.state !== "completed" || model.activity !== "idle") return
    const requestedPinKey = pinKey
    setModel((current) => ({ ...current, activity: "downloading", error: null }))
    void client.downloadExport(operation.operationId)
      .then((blob) => {
        if (currentPinKey.current !== requestedPinKey) return
        triggerDownload(blob)
        setModel((current) => ({ ...current, activity: "idle", error: null }))
      })
      .catch(() => {
        if (currentPinKey.current === requestedPinKey) {
          setModel((current) => ({ ...current, activity: "idle", error: "download-failed" }))
        }
      })
  }, [client, model.activity, model.operation, pinKey])

  const control = useMemo(() => projectLocalPdfExportControl(model), [model])
  const activate = useCallback(() => {
    if (control.action === "check-eligibility") setEligibilityAttempt((attempt) => attempt + 1)
    else if (control.action === "request") requestExport()
    else if (control.action === "cancel") cancelExport()
    else if (control.action === "download") downloadExport()
  }, [cancelExport, control.action, downloadExport, requestExport])

  return { activate, control, operation: model.operation }
}
