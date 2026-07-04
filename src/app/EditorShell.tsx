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
import type { ViewportScrollRootFacts } from "../editor/viewport/viewportMeasurement"

export interface EditorShellProps {
  canvasReorderDrag: CanvasReorderInteraction
  editorState: EditorRuntimeState
  mutationStatus: RuntimeNodeMutationStatus
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
  onSelectNode: (nodeId: string, source: EditorCommandSource) => void
  onSelectPaperPreset: (preset: PaperPreset) => void
  onSelectPaperZoom: (zoom: number) => void
  onViewportFactsChange: (facts: ViewportScrollRootFacts) => void
}

export function EditorShell({
  canvasReorderDrag,
  editorState,
  mutationStatus,
  onDeleteNode,
  onDuplicateNode,
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
  const canvasRenderView = useMemo(() => createEditorCanvasRenderView(view), [view])

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
          canvasReorderDrag={canvasReorderDrag}
          document={document}
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
        paper={paper}
        previewPageCount={canvasRenderView.pages.length}
        selection={selection}
        view={view}
      />
    </div>
  )
}
