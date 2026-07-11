import { useCallback, useEffect, useMemo, useState } from "react"
import { EditorShell } from "./EditorShell"
import { useCanvasReorderDrag } from "./useCanvasReorderDrag"
import { useBackendNodeMutation } from "./useBackendNodeMutation"
import type { PaperPreset } from "../editor/paper/paperModel"
import type { EditorCommand, EditorCommandSource, NodeReorderDirection } from "../editor/commands/commandTypes"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import {
  resolveFlowDocBackendBaseUrl,
  resolveFlowDocDocumentId,
} from "../editor/backend/backendConfig"
import { resolveFlowDocLayoutQaEnabled } from "../editor/config/editorFeatureConfig"
import { createFlowDocBackendClient } from "../editor/backend/backendTransport"
import type { EditorVersionCapabilityStatus } from "../editor/backend/backendVersionCapability"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { loadFrontendCoreWorkingSetFromTransportEnvelope } from "../editor/coreBinding/workingSetFactory"
import {
  createInitialEditorStateFromWorkingSet,
  recordViewportScrollRootFacts,
} from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"
import { getCanvasKeyboardReorderFocusDecision } from "../editor/interaction/canvasKeyboardReorderFocus"
import type { ViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"

export function EditorApp() {
  const backendBaseUrl = useMemo(
    () => resolveFlowDocBackendBaseUrl(import.meta.env.VITE_FLOWDOC_BACKEND_URL as string | undefined),
    [],
  )
  const documentId = useMemo(
    () => resolveFlowDocDocumentId(import.meta.env.VITE_FLOWDOC_DOCUMENT_ID as string | undefined),
    [],
  )
  const layoutQaEnabled = useMemo(
    () => resolveFlowDocLayoutQaEnabled(import.meta.env.VITE_FLOWDOC_LAYOUT_QA as string | undefined),
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
  const [versionCapabilityStatus, setVersionCapabilityStatus] = useState<EditorVersionCapabilityStatus>("checking")
  const {
    deleteNode,
    duplicateNode,
    mutationStatus,
    reorderNode,
    reorderNodeToIndex,
  } = useBackendNodeMutation({
    backendClient,
    editorState,
    enabled: versionCapabilityStatus === "compatible",
    setEditorState,
  })
  const [pendingKeyboardReorderFocusNodeId, setPendingKeyboardReorderFocusNodeId] = useState<string | null>(null)
  const [canvasFocusNodeId, setCanvasFocusNodeId] = useState<string | null>(null)
  const canvasReorderDrag = useCanvasReorderDrag({
    editorState,
    mutationStatus,
    onReorderNodeToIndex: reorderNodeToIndex,
  })

  useEffect(() => {
    let cancelled = false

    void backendClient.readVersionCapabilities()
      .then(async (capability) => {
        if (cancelled) return
        setVersionCapabilityStatus(capability.status)
        if (capability.status !== "compatible") return

        const result = await backendClient.readDocument(documentId)
        if (cancelled || result.status !== "found") {
          if (!cancelled && result.status === "unsupported-version") {
            setVersionCapabilityStatus("unsupported")
          }
          return
        }

        setEditorState(createInitialEditorStateFromWorkingSet(
          loadFrontendCoreWorkingSetFromTransportEnvelope(result.envelope),
        ))
      })
      .catch(() => {
        if (!cancelled) setVersionCapabilityStatus("unavailable")
        // Keep the fixture boot path active when the backend is unavailable.
      })

    return () => {
      cancelled = true
    }
  }, [backendClient, documentId])

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

  const handleReorderNode = useCallback((
    nodeId: string,
    direction: NodeReorderDirection,
    source: Extract<EditorCommandSource, "inspector" | "keyboard"> = "inspector",
  ) => {
    if (source === "keyboard") setPendingKeyboardReorderFocusNodeId(nodeId)
    reorderNode(nodeId, direction, source)
  }, [reorderNode])

  useEffect(() => {
    const decision = getCanvasKeyboardReorderFocusDecision(
      pendingKeyboardReorderFocusNodeId,
      mutationStatus,
    )
    if (decision.status === "idle") return

    if (decision.status === "focus") setCanvasFocusNodeId(decision.nodeId)
    setPendingKeyboardReorderFocusNodeId(null)
  }, [mutationStatus, pendingKeyboardReorderFocusNodeId])

  const handleCanvasFocusHandled = useCallback((nodeId: string) => {
    setCanvasFocusNodeId((currentNodeId) => (
      currentNodeId === nodeId ? null : currentNodeId
    ))
  }, [])

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
      canvasFocusNodeId={canvasFocusNodeId}
      canvasReorderDrag={canvasReorderDrag}
      editorState={editorState}
      layoutQaEnabled={layoutQaEnabled}
      mutationStatus={mutationStatus}
      onDeleteNode={deleteNode}
      onDuplicateNode={duplicateNode}
      onCanvasFocusHandled={handleCanvasFocusHandled}
      onReorderNode={handleReorderNode}
      onSelectNode={handleSelectNode}
      onSelectPaperPreset={handleSelectPaperPreset}
      onSelectPaperZoom={handleSelectPaperZoom}
      onViewportFactsChange={handleViewportFactsChange}
      versionCapabilityStatus={versionCapabilityStatus}
    />
  )
}
