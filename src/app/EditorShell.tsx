import { useMemo } from "react"
import { AppHeader } from "../components/shell/AppHeader"
import { EditorToolbar } from "../components/shell/EditorToolbar"
import { StatusBar } from "../components/shell/StatusBar"
import { CanvasSurface } from "../components/canvas/CanvasSurface"
import { DiagnosticsPanel } from "../components/diagnostics/DiagnosticsPanel"
import { InspectorPanel } from "../components/inspector/InspectorPanel"
import { OutlinePanel } from "../components/outline/OutlinePanel"
import type { EditorCommandSource, NodeReorderDirection } from "../editor/commands/commandTypes"
import type { PaperPreset } from "../editor/paper/paperModel"
import { createEditorCanvasRenderView } from "../editor/runtime/editorCanvasRenderView"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import { getInspectorFacts, getOutlineItems } from "../editor/runtime/editorView"
import type { RuntimeNodeMutationStatus } from "../editor/runtime/runtimeMutationStatus"
import type { CanvasReorderInteraction } from "../editor/interaction/canvasReorderDragSession"
import { createRenderProjectionLayoutQaSummary } from "../editor/render/renderProjectionLayoutQa"
import type { ViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"
import type { EditorVersionCapabilityStatus } from "../editor/backend/backendVersionCapability"
import type { RuntimeDocumentMigrationStatus } from "../editor/runtime/runtimeMigrationStatus"
import type { LocalPdfExportInteraction } from "./useLocalPdfExport"
import type { DocumentWorkspaceView } from "./documentWorkspaceRoute"
import { PreviewUnavailableView } from "../components/preview/PreviewUnavailableView"
import { PreviewTestInputView } from "../components/preview/PreviewTestInputView"
import type { PreviewTestInputInteraction } from "./usePreviewTestInput"
import type { VNextPublishedStructureTestInputProjectionV1 } from "../core/coreAdapter"
import type { PublishedPreviewGenerationInteraction } from "./usePublishedPreviewGeneration"

export interface EditorShellProps {
  activeWorkspaceView: DocumentWorkspaceView
  canvasFocusNodeId: string | null
  canvasReorderDrag: CanvasReorderInteraction
  editorState: EditorRuntimeState
  layoutQaEnabled: boolean
  localPdfExport: LocalPdfExportInteraction
  previewTestInput: PreviewTestInputInteraction
  publishedPreview: PublishedPreviewGenerationInteraction | null
  previewTarget: "draft" | "published"
  previewTargetAvailability: { draft: boolean; published: boolean }
  testInputProjection: VNextPublishedStructureTestInputProjectionV1 | null
  migrationEnabled: boolean
  migrationStatus: RuntimeDocumentMigrationStatus
  mutationStatus: RuntimeNodeMutationStatus
  versionCapabilityStatus: EditorVersionCapabilityStatus
  onBackToLibrary?: () => void
  onSelectPreviewTarget: (target: "draft" | "published") => void
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onMigrateDocument: () => void
  onCanvasFocusHandled: (nodeId: string) => void
  onReorderNode: (
    nodeId: string,
    direction: NodeReorderDirection,
    source?: Extract<EditorCommandSource, "inspector" | "keyboard">,
  ) => void
  onSelectNode: (nodeId: string, source: EditorCommandSource) => void
  onSelectPaperPreset: (preset: PaperPreset) => void
  onSelectPaperZoom: (zoom: number) => void
  onSelectWorkspaceView?: (view: DocumentWorkspaceView) => void
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function EditorShell({
  activeWorkspaceView,
  canvasFocusNodeId,
  canvasReorderDrag,
  editorState,
  layoutQaEnabled,
  localPdfExport,
  previewTestInput,
  publishedPreview,
  previewTarget,
  previewTargetAvailability,
  testInputProjection,
  migrationEnabled,
  migrationStatus,
  mutationStatus,
  versionCapabilityStatus,
  onBackToLibrary,
  onSelectPreviewTarget,
  onDeleteNode,
  onDuplicateNode,
  onMigrateDocument,
  onCanvasFocusHandled,
  onReorderNode,
  onSelectNode,
  onSelectPaperPreset,
  onSelectPaperZoom,
  onSelectWorkspaceView,
  onViewportFactsChange,
}: EditorShellProps) {
  const { core, jobs, paper, selection, view } = editorState
  const { diagnostics, document } = core
  const selectedNodeId = selection.selectedNodeId
  const inspectorFacts = getInspectorFacts(view, selectedNodeId)
  const outlineItems = getOutlineItems(view)
  const canvasRenderView = useMemo(() => createEditorCanvasRenderView(view, paper), [paper, view])
  const layoutQaSummary = useMemo(() => (
    layoutQaEnabled
      ? createRenderProjectionLayoutQaSummary(canvasRenderView.pages)
      : null
  ), [canvasRenderView.pages, layoutQaEnabled])

  return (
    <div className="editor-shell">
      <AppHeader
        activeView={activeWorkspaceView}
        document={document}
        diagnostics={diagnostics}
        onBackToLibrary={onBackToLibrary}
        onSelectView={onSelectWorkspaceView}
      />
      <div className="workspace-view-stack">
        <div
          aria-labelledby="workspace-tab-design"
          className="editor-design-view"
          hidden={activeWorkspaceView !== "design"}
          id="workspace-panel-design"
          role="tabpanel"
        >
          <EditorToolbar
            diagnostics={diagnostics}
            migrationEnabled={migrationEnabled}
            migrationStatus={migrationStatus}
            localPdfExport={localPdfExport}
            onMigrateDocument={onMigrateDocument}
            paper={paper}
            onSelectPaperPreset={onSelectPaperPreset}
            onSelectPaperZoom={onSelectPaperZoom}
          />
          <main className="editor-workspace" aria-label="FlowDoc editor workspace">
            <OutlinePanel items={outlineItems} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
            <CanvasSurface
              canvasFocusNodeId={canvasFocusNodeId}
              canvasReorderDrag={canvasReorderDrag}
              document={document}
              onCanvasFocusHandled={onCanvasFocusHandled}
              onKeyboardReorderNode={(nodeId, direction) => onReorderNode(nodeId, direction, "keyboard")}
              pages={canvasRenderView.pages}
              paper={paper}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onViewportFactsChange={onViewportFactsChange}
            />
            <aside className="editor-side-panel" aria-label="Inspector and diagnostics">
              <InspectorPanel
                facts={inspectorFacts}
                mutationStatus={mutationStatus}
                onDeleteNode={onDeleteNode}
                onDuplicateNode={onDuplicateNode}
                onReorderNode={onReorderNode}
              />
              <DiagnosticsPanel
                diagnostics={diagnostics}
                selection={selection}
                view={view}
              />
            </aside>
          </main>
          <StatusBar
            core={core}
            document={document}
            history={editorState.history}
            jobs={jobs}
            layoutQaSummary={layoutQaSummary}
            paper={paper}
            previewPageCount={canvasRenderView.pages.length}
            selection={selection}
            view={view}
            versionCapabilityStatus={versionCapabilityStatus}
          />
        </div>
        {activeWorkspaceView === "preview" ? (
          <div
            aria-labelledby="workspace-tab-preview"
            className="preview-workspace-panel"
            id="workspace-panel-preview"
            role="tabpanel"
          >
            {testInputProjection && previewTestInput.form.state && previewTestInput.json.state ? (
              <PreviewTestInputView
                document={document}
                interaction={previewTestInput}
                publishedPreview={publishedPreview}
                previewTarget={previewTarget}
                previewTargetAvailability={previewTargetAvailability}
                onSelectPreviewTarget={onSelectPreviewTarget}
                projection={testInputProjection}
              />
            ) : (
              <PreviewUnavailableView
                document={document}
                onReturnToDesign={() => onSelectWorkspaceView?.("design")}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
