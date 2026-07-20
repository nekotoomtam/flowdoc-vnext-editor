import { useCallback, useEffect, useState } from "react"
import type { LocalPdfExportDocumentPin } from "../editor/pdfExport/localPdfExportContracts"
import type { DraftPreviewContext } from "../editor/preview/draftPreviewContracts"
import type { DraftPreviewClient } from "../editor/preview/draftPreviewTransport"

export interface DraftPreviewContextInteraction {
  status: "checking" | "ready" | "unavailable"
  context: DraftPreviewContext | null
  retry: () => void
}

export function useDraftPreviewContext(options: {
  client: DraftPreviewClient
  enabled?: boolean
  pin: LocalPdfExportDocumentPin
}): DraftPreviewContextInteraction {
  const enabled = options.enabled ?? true
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<Pick<DraftPreviewContextInteraction, "status" | "context">>({
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
      .then((context) => { if (!cancelled) setState({ status: "ready", context }) })
      .catch(() => { if (!cancelled) setState({ status: "unavailable", context: null }) })
    return () => { cancelled = true }
  }, [attempt, enabled, options.client, options.pin.documentId, options.pin.documentRevision])
  const retry = useCallback(() => setAttempt((current) => current + 1), [])
  return { ...state, retry }
}
