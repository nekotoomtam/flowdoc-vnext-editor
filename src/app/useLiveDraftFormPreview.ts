import { useEffect, useMemo, useRef, useState } from "react"
import type { PreviewTestInputFormInteraction } from "./usePreviewTestInputForm"
import {
  createFlowDocLiveDraftBrowserClientV1,
  type FlowDocLiveDraftFormClientV1,
} from "../editor/liveDraft/liveDraftBrowserClient"
import {
  createFlowDocLiveDraftFormControllerV1,
  createFlowDocLiveDraftFormInitialStateV1,
  type FlowDocLiveDraftFormControllerStateV1,
} from "../editor/liveDraft/liveDraftFormController"
import { projectFlowDocLiveDraftFormCandidateV1 } from "../editor/liveDraft/liveDraftFormProjection"

export interface LiveDraftFormPreviewInteractionV1 extends FlowDocLiveDraftFormControllerStateV1 {
  enabled: boolean
  selectedFieldKey: string
}

export interface UseLiveDraftFormPreviewOptionsV1 {
  enabled: boolean
  documentId: string
  structureRevision: number
  selectedFieldKey: string
  form: PreviewTestInputFormInteraction
  debounceMs?: number
  createClient?: () => FlowDocLiveDraftFormClientV1
}

export function useLiveDraftFormPreviewV1(
  options: UseLiveDraftFormPreviewOptionsV1,
): LiveDraftFormPreviewInteractionV1 {
  const [state, setState] = useState(createFlowDocLiveDraftFormInitialStateV1)
  const controllerRef = useRef<ReturnType<typeof createFlowDocLiveDraftFormControllerV1> | null>(null)
  const projection = useMemo(() => projectFlowDocLiveDraftFormCandidateV1({
    documentId: options.documentId,
    structureRevision: options.structureRevision,
    fieldKey: options.selectedFieldKey,
    formState: options.form.state,
    candidate: options.form.candidate,
  }), [
    options.documentId,
    options.form.candidate,
    options.form.state,
    options.selectedFieldKey,
    options.structureRevision,
  ])

  useEffect(() => {
    if (!options.enabled) {
      setState(createFlowDocLiveDraftFormInitialStateV1())
      return
    }
    const client = options.createClient?.() ?? createFlowDocLiveDraftBrowserClientV1()
    const controller = createFlowDocLiveDraftFormControllerV1({
      debounceMs: options.debounceMs,
      dependencies: {
        layout: (input) => client.layout(input),
        cancel: (input) => client.cancel(input),
        now: () => performance.now(),
        setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
        clearTimer: (timer) => window.clearTimeout(timer as number),
        onStateChange: setState,
      },
    })
    controllerRef.current = controller
    return () => {
      controller.dispose()
      client.dispose()
      controllerRef.current = null
    }
  }, [options.createClient, options.debounceMs, options.enabled])

  useEffect(() => {
    if (!options.enabled) return
    controllerRef.current?.update(projection)
  }, [options.enabled, projection])

  return {
    ...state,
    enabled: options.enabled,
    selectedFieldKey: options.selectedFieldKey,
  }
}
