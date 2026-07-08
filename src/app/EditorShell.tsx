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

export interface EditorShellProps {
  canvasFocusNodeId: string | null
  canvasReorderDrag: CanvasReorderInteraction
  editorState: EditorRuntimeState
  layoutQaEnabled: boolean
  mutationStatus: RuntimeNodeMutationStatus
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onCanvasFocusHandled: (nodeId: string) => void
  onReorderNode: (
    nodeId: string,
    direction: NodeReorderDirection,
    source?: Extract<EditorCommandSource, "inspector" | "keyboard">,
  ) => void
  onSelectNode: (nodeId: string, source: EditorCommandSource) => void
  onSelectPaperPreset: (preset: PaperPreset) => void
  onSelectPaperZoom: (zoom: number) => void
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function EditorShell({
  canvasFocusNodeId,
  canvasReorderDrag,
  editorState,
  layoutQaEnabled,
  mutationStatus,
  onDeleteNode,
  onDuplicateNode,
  onCanvasFocusHandled,
  onReorderNode,
  onSelectNode,
  onSelectPaperPreset,
  onSelectPaperZoom,
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
      <AppHeader document={document} diagnostics={diagnostics} />
      <EditorToolbar
        diagnostics={diagnostics}
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
      />
    </div>
  )
}
