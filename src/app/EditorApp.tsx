import { useCallback, useEffect, useMemo, useState } from "react"
import { EditorShell } from "./EditorShell"
import { useBackendNodeMutation } from "./useBackendNodeMutation"
import type { PaperPreset } from "../editor/paper/paperModel"
import type { EditorCommand, EditorCommandSource } from "../editor/commands/commandTypes"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import { resolveFlowDocBackendBaseUrl } from "../editor/backend/backendConfig"
import { createFlowDocBackendClient } from "../editor/backend/backendTransport"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { loadFrontendCoreWorkingSetFromTransportEnvelope } from "../editor/coreBinding/workingSetFactory"
import {
  createInitialEditorStateFromWorkingSet,
  recordViewportScrollRootFacts,
} from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"
import type { ViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"

export function EditorApp() {
  const backendBaseUrl = useMemo(
    () => resolveFlowDocBackendBaseUrl(import.meta.env.VITE_FLOWDOC_BACKEND_URL as string | undefined),
    [],
  )
  const backendClient = useMemo(
    () => createFlowDocBackendClient({
      baseUrl: backendBaseUrl,
    }),
    [backendBaseUrl],
  )
  const initialState = useMemo(
    () => createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
      baseRevision: 3,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })),
    [],
  )
  const [editorState, setEditorState] = useState(initialState)
  const {
    deleteNode,
    duplicateNode,
    mutationStatus,
    reorderNode,
  } = useBackendNodeMutation({
    backendClient,
    editorState,
    setEditorState,
  })

  useEffect(() => {
    let cancelled = false

    void backendClient.readDocument(CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID)
      .then((result) => {
        if (cancelled || result.status !== "found") return

        const state = createInitialEditorStateFromWorkingSet(
          loadFrontendCoreWorkingSetFromTransportEnvelope(result.envelope),
        )
        setEditorState(state)
      })
      .catch(() => {
        // Keep the fixture boot path active when the backend is unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [backendClient])

  const dispatchEditorCommand = useCallback((command: EditorCommand) => {
    setEditorState((currentState) => dispatchEditorRuntimeCommand(currentState, command).state)
  }, [])

  const handleSelectNode = useCallback((nodeId: string, source: EditorCommandSource) => {
    dispatchEditorCommand({
      kind: "selection.selectNode",
      reason: `${source}-select`,
      source,
      target: {
        nodeId,
      },
    })
  }, [dispatchEditorCommand])

  const handleSelectPaperPreset = useCallback((preset: PaperPreset) => {
    dispatchEditorCommand({
      kind: "viewport.setPaperPreset",
      payload: {
        preset,
      },
      source: "toolbar",
    })
  }, [dispatchEditorCommand])

  const handleSelectPaperZoom = useCallback((zoom: number) => {
    dispatchEditorCommand({
      kind: "viewport.setZoom",
      payload: {
        zoom,
      },
      source: "toolbar",
    })
  }, [dispatchEditorCommand])

  const handleViewportFactsChange = useCallback((facts: ViewportScrollRootFacts) => {
    setEditorState((currentState) => recordViewportScrollRootFacts(currentState, facts))
  }, [])

  return (
    <EditorShell
      editorState={editorState}
      mutationStatus={mutationStatus}
      onDeleteNode={deleteNode}
      onDuplicateNode={duplicateNode}
      onReorderNode={reorderNode}
      onSelectNode={handleSelectNode}
      onSelectPaperPreset={handleSelectPaperPreset}
      onSelectPaperZoom={handleSelectPaperZoom}
      onViewportFactsChange={handleViewportFactsChange}
    />
  )
}
