import { Copy } from "lucide-react"
import type { EditorInspectorFacts } from "../../editor/runtime/editorView"
import type { RuntimeDuplicateMutationStatus } from "../../editor/runtime/runtimeMutationStatus"

export interface InspectorPanelProps {
  duplicateStatus: RuntimeDuplicateMutationStatus
  facts: EditorInspectorFacts | null
  onDuplicateNode: (nodeId: string) => void
}

function capabilityLabel(value: boolean | null): string {
  return value === null ? "unknown" : value ? "yes" : "no"
}

export function InspectorPanel({
  duplicateStatus,
  facts,
  onDuplicateNode,
}: InspectorPanelProps) {
  const duplicateDisabled = !facts
    || facts.canBeDuplicated !== true
    || duplicateStatus.status === "pending"
  const duplicateMessage = duplicateStatus.message
  const duplicateTitle = facts?.canBeDuplicated === true
    ? "Duplicate selected node"
    : "Selected node cannot be duplicated"

  return (
    <section className="inspector-panel" aria-label="Inspector">
      <div className="panel-heading">Inspector</div>
      {facts ? (
        <>
          <div className="inspector-actions" aria-label="Node actions">
            <button
              className="tool-button inspector-action-button"
              disabled={duplicateDisabled}
              onClick={() => onDuplicateNode(facts.id)}
              title={duplicateTitle}
              type="button"
            >
              <Copy aria-hidden="true" size={16} />
              <span>{duplicateStatus.status === "pending" ? "Duplicating" : "Duplicate"}</span>
            </button>
            {duplicateMessage ? (
              <p className="inspector-action-status" data-status={duplicateStatus.status}>
                {duplicateMessage}
              </p>
            ) : null}
          </div>
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
              <dt>Role</dt>
              <dd>{facts.textRole ?? "none"}</dd>
            </div>
            <div>
              <dt>Surface</dt>
              <dd>{facts.operationSurface ?? "none"}</dd>
            </div>
            <div>
              <dt>Children</dt>
              <dd>{facts.childCount}</dd>
            </div>
            <div>
              <dt>Delete</dt>
              <dd>{capabilityLabel(facts.canBeDeleted)}</dd>
            </div>
            <div>
              <dt>Duplicate</dt>
              <dd>{capabilityLabel(facts.canBeDuplicated)}</dd>
            </div>
            <div>
              <dt>Reorder</dt>
              <dd>{capabilityLabel(facts.canBeReordered)}</dd>
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
        </>
      ) : (
        <p className="empty-panel">No node selected.</p>
      )}
    </section>
  )
}
