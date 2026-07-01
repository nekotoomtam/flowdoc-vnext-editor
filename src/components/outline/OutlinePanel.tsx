import type { EditorOutlineItem } from "../../editor/runtime/editorView"

export interface OutlinePanelProps {
  items: EditorOutlineItem[]
  onSelectNode: (nodeId: string, source: "outline") => void
  selectedNodeId: string
}

export function OutlinePanel({ items, onSelectNode, selectedNodeId }: OutlinePanelProps) {
  return (
    <aside className="outline-panel" aria-label="Document outline">
      <div className="panel-heading">Outline</div>
      <div className="outline-list">
        {items.map((item) => (
          <button
            className="outline-item"
            data-node-id={item.id}
            data-selected={item.id === selectedNodeId ? "true" : "false"}
            key={item.id}
            onClick={() => onSelectNode(item.id, "outline")}
            style={{ paddingInlineStart: `${12 + item.depth * 14}px` }}
            type="button"
          >
            <span>{item.label}</span>
            <em>{item.type}</em>
          </button>
        ))}
      </div>
    </aside>
  )
}
