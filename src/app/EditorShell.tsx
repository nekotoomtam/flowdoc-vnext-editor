import { AppHeader } from "../components/shell/AppHeader"
import { EditorToolbar } from "../components/shell/EditorToolbar"
import { StatusBar } from "../components/shell/StatusBar"
import { CanvasSurface } from "../components/canvas/CanvasSurface"
import { DiagnosticsPanel } from "../components/diagnostics/DiagnosticsPanel"
import { InspectorPanel } from "../components/inspector/InspectorPanel"
import { OutlinePanel } from "../components/outline/OutlinePanel"
import type { EditorCommandSource } from "../editor/commands/commandTypes"
import type { PaperPreset } from "../editor/paper/paperModel"
import { projectPreviewPages } from "../editor/render/renderProjector"
import type { EditorRuntimeState } from "../editor/runtime/editorState"
import { getInspectorFacts, getOutlineItems } from "../editor/runtime/editorView"

export interface EditorShellProps {
  editorState: EditorRuntimeState
  onSelectNode: (nodeId: string, source: EditorCommandSource) => void
  onSelectPaperPreset: (preset: PaperPreset) => void
  onSelectPaperZoom: (zoom: number) => void
}

export function EditorShell({
  editorState,
  onSelectNode,
  onSelectPaperPreset,
  onSelectPaperZoom,
}: EditorShellProps) {
  const { jobs, paper, seed, selectedNodeId, selectionReason, view } = editorState
  const inspectorFacts = getInspectorFacts(view, selectedNodeId)
  const outlineItems = getOutlineItems(view)
  const renderablePages = projectPreviewPages(view)

  return (
    <div className="editor-shell">
      <AppHeader document={seed.document} diagnostics={seed.diagnostics} />
      <EditorToolbar
        diagnostics={seed.diagnostics}
        paper={paper}
        onSelectPaperPreset={onSelectPaperPreset}
        onSelectPaperZoom={onSelectPaperZoom}
      />
      <main className="editor-workspace" aria-label="FlowDoc editor workspace">
        <OutlinePanel items={outlineItems} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
        <CanvasSurface
          document={seed.document}
          pages={renderablePages}
          paper={paper}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
        <aside className="editor-side-panel" aria-label="Inspector and diagnostics">
          <InspectorPanel facts={inspectorFacts} />
          <DiagnosticsPanel
            diagnostics={seed.diagnostics}
            selectionReason={selectionReason}
            view={view}
          />
        </aside>
      </main>
      <StatusBar
        document={seed.document}
        history={editorState.history}
        jobs={jobs}
        paper={paper}
        previewPageCount={renderablePages.length}
        selectedNodeId={selectedNodeId}
        view={view}
      />
    </div>
  )
}
