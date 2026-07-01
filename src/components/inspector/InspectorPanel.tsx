import type { EditorInspectorFacts } from "../../editor/runtime/editorView"

export interface InspectorPanelProps {
  facts: EditorInspectorFacts | null
}

export function InspectorPanel({ facts }: InspectorPanelProps) {
  return (
    <section className="inspector-panel" aria-label="Inspector">
      <div className="panel-heading">Inspector</div>
      {facts ? (
        <dl className="facts-list">
          <div>
            <dt>Label</dt>
            <dd>{facts.label}</dd>
          </div>
          <div>
            <dt>Node</dt>
            <dd>{facts.id}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{facts.type}</dd>
          </div>
          <div>
            <dt>Children</dt>
            <dd>{facts.childCount}</dd>
          </div>
          <div>
            <dt>Section</dt>
            <dd>{facts.sectionId ?? "none"}</dd>
          </div>
          <div>
            <dt>Zone</dt>
            <dd>{facts.zoneId ?? "none"}</dd>
          </div>
          <div>
            <dt>Parent</dt>
            <dd>{facts.parentId ?? "none"}</dd>
          </div>
        </dl>
      ) : (
        <p className="empty-panel">No node selected.</p>
      )}
    </section>
  )
}
