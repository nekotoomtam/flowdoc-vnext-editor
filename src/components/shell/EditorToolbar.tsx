import {
  ClipboardPlus,
  FileText,
  Highlighter,
  RotateCcw,
  Table2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { CoreDiagnosticsSummary } from "../../core/coreTypes"
import type { PaperModel, PaperPreset } from "../../editor/paper/paperModel"

export interface EditorToolbarProps {
  diagnostics: CoreDiagnosticsSummary
  onSelectPaperPreset: (preset: PaperPreset) => void
  onSelectPaperZoom: (zoom: number) => void
  paper: PaperModel
}

const PAPER_PRESETS: PaperPreset[] = ["A4", "Letter"]

export function EditorToolbar({
  diagnostics,
  onSelectPaperPreset,
  onSelectPaperZoom,
  paper,
}: EditorToolbarProps) {
  const zoomPercent = Math.round(paper.zoom * 100)

  return (
    <nav className="editor-toolbar" aria-label="Editor toolbar">
      <div className="toolbar-group" aria-label="Editing commands">
        <button className="tool-button" type="button" disabled title="Insert block">
          <ClipboardPlus aria-hidden="true" size={16} />
          <span>Insert</span>
        </button>
        <button className="tool-button" type="button" disabled title="Text command policy">
          <Type aria-hidden="true" size={16} />
          <span>Text</span>
        </button>
        <button className="tool-button" type="button" disabled title="Fields command policy">
          <Highlighter aria-hidden="true" size={16} />
          <span>Fields</span>
        </button>
        <button className="tool-button" type="button" disabled title="Table command policy">
          <Table2 aria-hidden="true" size={16} />
          <span>Table</span>
        </button>
      </div>
      <div className="toolbar-divider" aria-hidden="true" />
      <div className="toolbar-group" aria-label="Paper size">
        <FileText aria-hidden="true" className="toolbar-group-icon" size={16} />
        <div className="segmented-control">
          {PAPER_PRESETS.map((preset) => (
            <button
              aria-pressed={paper.preset === preset}
              className="segmented-button"
              data-active={paper.preset === preset ? "true" : "false"}
              key={preset}
              onClick={() => onSelectPaperPreset(preset)}
              type="button"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      <div className="toolbar-divider" aria-hidden="true" />
      <div className="toolbar-group" aria-label="Canvas zoom">
        <button
          aria-label="Zoom out"
          className="icon-button"
          onClick={() => onSelectPaperZoom(paper.zoom - 0.1)}
          title="Zoom out"
          type="button"
        >
          <ZoomOut aria-hidden="true" size={16} />
        </button>
        <span className="zoom-readout">{zoomPercent}%</span>
        <button
          aria-label="Zoom in"
          className="icon-button"
          onClick={() => onSelectPaperZoom(paper.zoom + 0.1)}
          title="Zoom in"
          type="button"
        >
          <ZoomIn aria-hidden="true" size={16} />
        </button>
        <button
          aria-label="Reset zoom"
          className="icon-button"
          onClick={() => onSelectPaperZoom(0.85)}
          title="Reset zoom"
          type="button"
        >
          <RotateCcw aria-hidden="true" size={15} />
        </button>
      </div>
      <div className="toolbar-spacer" />
      <span className="toolbar-readiness">Keys: {diagnostics.keyDataStatus}</span>
    </nav>
  )
}
