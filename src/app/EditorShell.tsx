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
  const { core, jobs, paper, selection, view } = editorState
  const { diagnostics, document } = core
  const selectedNodeId = selection.selectedNodeId
  const inspectorFacts = getInspectorFacts(view, selectedNodeId)
  const outlineItems = getOutlineItems(view)
  const renderablePages = projectPreviewPages(view)

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
          document={document}
          pages={renderablePages}
          paper={paper}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
        <aside className="editor-side-panel" aria-label="Inspector and diagnostics">
          <InspectorPanel facts={inspectorFacts} />
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
        previewPageCount={renderablePages.length}
        selection={selection}
        view={view}
      />
    </div>
  )
}
