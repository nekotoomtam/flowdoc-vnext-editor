import { useCallback, useEffect, useMemo, useState } from "react"
import { EditorShell } from "./EditorShell"
import { useCanvasReorderDrag } from "./useCanvasReorderDrag"
import { useBackendNodeMutation } from "./useBackendNodeMutation"
import { useBackendDocumentMigration } from "./useBackendDocumentMigration"
import { useLocalPdfExport } from "./useLocalPdfExport"
import type { PaperPreset } from "../editor/paper/paperModel"
import type { EditorCommand, EditorCommandSource, NodeReorderDirection } from "../editor/commands/commandTypes"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import {
  resolveFlowDocBackendBaseUrl,
  resolveFlowDocDocumentId,
} from "../editor/backend/backendConfig"
import { resolveFlowDocLayoutQaEnabled } from "../editor/config/editorFeatureConfig"
import { createFlowDocBackendClient } from "../editor/backend/backendTransport"
import { createLocalPdfExportClient } from "../editor/pdfExport/localPdfExportTransport"
import type { EditorVersionCapabilityStatus } from "../editor/backend/backendVersionCapability"
import type { EditorBackendMutationOperationKind } from "../editor/backend/backendVersionCapability"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { loadFrontendCoreWorkingSetFromTransportEnvelope } from "../editor/coreBinding/workingSetFactory"
import {
  createInitialEditorStateFromWorkingSet,
  recordViewportScrollRootFacts,
} from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"
import { getCanvasKeyboardReorderFocusDecision } from "../editor/interaction/canvasKeyboardReorderFocus"
import type { ViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"
import type { DocumentWorkspaceView } from "./documentWorkspaceRoute"
import type { VNextPublishedStructureTestInputProjectionV1 } from "../core/coreAdapter"
import { usePreviewTestInput } from "./usePreviewTestInput"
import { createPublishedPreviewClient } from "../editor/preview/publishedPreviewTransport"
import { usePublishedPreviewContext } from "./usePublishedPreviewContext"
import { usePublishedPreviewGeneration } from "./usePublishedPreviewGeneration"

export interface EditorAppProps {
  activeWorkspaceView?: DocumentWorkspaceView
  documentId?: string
  onBackToLibrary?: () => void
  onSelectWorkspaceView?: (view: DocumentWorkspaceView) => void
  testInputProjection?: VNextPublishedStructureTestInputProjectionV1 | null
}

export function EditorApp({
  activeWorkspaceView = "design",
  documentId: requestedDocumentId,
  onBackToLibrary,
  onSelectWorkspaceView,
  testInputProjection = null,
}: EditorAppProps) {
  const backendBaseUrl = useMemo(
    () => resolveFlowDocBackendBaseUrl(import.meta.env.VITE_FLOWDOC_BACKEND_URL as string | undefined),
    [],
  )
  const documentId = useMemo(
    () => resolveFlowDocDocumentId(
      requestedDocumentId ?? import.meta.env.VITE_FLOWDOC_DOCUMENT_ID as string | undefined,
    ),
    [requestedDocumentId],
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
  const localPdfExportClient = useMemo(() => createLocalPdfExportClient(), [])
  const publishedPreviewClient = useMemo(() => createPublishedPreviewClient(), [])
  const initialState = useMemo(
    () => createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
      baseRevision: 3,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })),
    [],
  )
  const [editorState, setEditorState] = useState(initialState)
  const publishedPreviewContext = usePublishedPreviewContext({
    client: publishedPreviewClient,
    enabled: activeWorkspaceView === "preview" && editorState.core.envelope.status === "fresh",
    pin: {
      documentId: editorState.core.envelope.documentId,
      documentRevision: editorState.core.envelope.documentRevision,
    },
  })
  const effectiveTestInputProjection = testInputProjection ?? publishedPreviewContext.context?.projection ?? null
  const previewTestInput = usePreviewTestInput(
    effectiveTestInputProjection,
    publishedPreviewContext.context?.mappingProfiles ?? [],
  )
  const publishedPreview = usePublishedPreviewGeneration({
    context: publishedPreviewContext.context,
    input: previewTestInput,
    client: publishedPreviewClient,
    pdfClient: localPdfExportClient,
  })
  const localPdfExport = useLocalPdfExport({
    client: localPdfExportClient,
    enabled: editorState.core.envelope.status === "fresh",
    pin: {
      documentId: editorState.core.envelope.documentId,
      documentRevision: editorState.core.envelope.documentRevision,
    },
  })
  const [versionCapabilityStatus, setVersionCapabilityStatus] = useState<EditorVersionCapabilityStatus>("checking")
  const [migrationPersistenceAvailable, setMigrationPersistenceAvailable] = useState(false)
  const [mutationOperationSupport, setMutationOperationSupport] = useState<
    Array<{ pair: { packageVersion: number; documentVersion: number }; operationKinds: EditorBackendMutationOperationKind[] }>
  >([])
  const enabledMutationOperationKinds = mutationOperationSupport.find((entry) => (
    entry.pair.packageVersion === editorState.seed.document.packageVersion
    && entry.pair.documentVersion === editorState.seed.document.documentVersion
  ))?.operationKinds ?? []
  const migrationEnabled = versionCapabilityStatus === "compatible"
    && migrationPersistenceAvailable
    && editorState.core.envelope.sourceKind === "api"
    && editorState.seed.document.runtimeMode === "active"
    && editorState.seed.document.packageVersion === 2
    && editorState.seed.document.documentVersion === 3
  const { migrateDocument, migrationStatus } = useBackendDocumentMigration({
    backendClient,
    editorState,
    enabled: migrationEnabled,
    setEditorState,
  })
  const {
    deleteNode,
    duplicateNode,
    mutationStatus,
    reorderNode,
    reorderNodeToIndex,
  } = useBackendNodeMutation({
    backendClient,
    editorState,
    enabled: versionCapabilityStatus === "compatible"
      && migrationStatus.status !== "pending",
    enabledOperationKinds: enabledMutationOperationKinds.filter((kind) => (
      kind === "node.delete" || kind === "node.duplicate" || kind === "node.reorder"
    )),
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
        setMigrationPersistenceAvailable(
          capability.status === "compatible"
          && capability.envelope.migrationPersistence === "available",
        )
        setMutationOperationSupport(
          capability.status === "compatible" ? capability.envelope.mutationOperations : [],
        )
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
        if (!cancelled) {
          setVersionCapabilityStatus("unavailable")
          setMigrationPersistenceAvailable(false)
          setMutationOperationSupport([])
        }
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
      activeWorkspaceView={activeWorkspaceView}
      layoutQaEnabled={layoutQaEnabled}
      localPdfExport={localPdfExport}
      previewTestInput={previewTestInput}
      publishedPreview={publishedPreviewContext.status === "ready" ? publishedPreview : null}
      testInputProjection={effectiveTestInputProjection}
      migrationEnabled={migrationEnabled}
      migrationStatus={migrationStatus}
      mutationStatus={mutationStatus}
      onDeleteNode={deleteNode}
      onDuplicateNode={duplicateNode}
      onMigrateDocument={migrateDocument}
      onBackToLibrary={onBackToLibrary}
      onCanvasFocusHandled={handleCanvasFocusHandled}
      onReorderNode={handleReorderNode}
      onSelectNode={handleSelectNode}
      onSelectPaperPreset={handleSelectPaperPreset}
      onSelectPaperZoom={handleSelectPaperZoom}
      onSelectWorkspaceView={onSelectWorkspaceView}
      onViewportFactsChange={handleViewportFactsChange}
      versionCapabilityStatus={versionCapabilityStatus}
    />
  )
}
