import { useCallback, useEffect, useState } from "react"
import type { LocalPdfExportDocumentPin } from "../editor/pdfExport/localPdfExportContracts"
import type { PublishedPreviewContext } from "../editor/preview/publishedPreviewContracts"
import type { PublishedPreviewClient } from "../editor/preview/publishedPreviewTransport"

export interface PublishedPreviewContextInteraction {
  status: "checking" | "ready" | "unavailable"
  context: PublishedPreviewContext | null
  retry: () => void
}

export function usePublishedPreviewContext(options: {
  client: PublishedPreviewClient
  enabled?: boolean
  pin: LocalPdfExportDocumentPin
}): PublishedPreviewContextInteraction {
  const enabled = options.enabled ?? true
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Pick<PublishedPreviewContextInteraction, "status" | "context">>({
    status: enabled ? "checking" : "unavailable",
    context: null,
  })

  useEffect(() => {
    let cancelled = false
    if (!enabled) {
      setState({ status: "unavailable", context: null })
      return () => { cancelled = true }
    }
    setState({ status: "checking", context: null })
    void options.client.readContext(options.pin)
      .then((context) => {
        if (!cancelled) setState({ status: "ready", context })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "unavailable", context: null })
      })
    return () => { cancelled = true }
  }, [attempt, enabled, options.client, options.pin.documentId, options.pin.documentRevision])

  const retry = useCallback(() => setAttempt((current) => current + 1), [])
  return { ...state, retry }
}
