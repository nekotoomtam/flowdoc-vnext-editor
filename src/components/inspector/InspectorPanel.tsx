import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react"
import type { NodeReorderDirection } from "../../editor/commands/commandTypes"
import type { EditorInspectorFacts } from "../../editor/runtime/editorView"
import type { RuntimeNodeMutationStatus } from "../../editor/runtime/runtimeMutationStatus"

export interface InspectorPanelProps {
  facts: EditorInspectorFacts | null
  mutationStatus: RuntimeNodeMutationStatus
  onDeleteNode: (nodeId: string) => void
  onDuplicateNode: (nodeId: string) => void
  onReorderNode: (nodeId: string, direction: NodeReorderDirection) => void
}

function capabilityLabel(value: boolean | null): string {
  return value === null ? "unknown" : value ? "yes" : "no"
}

export function InspectorPanel({
  facts,
  mutationStatus,
  onDeleteNode,
  onDuplicateNode,
  onReorderNode,
}: InspectorPanelProps) {
  const mutationPending = mutationStatus.status === "pending"
  const deleteDisabled = !facts
    || facts.canBeDeleted !== true
    || mutationPending
  const duplicateDisabled = !facts
    || facts.canBeDuplicated !== true
    || mutationPending
  const moveDownDisabled = !facts
    || facts.canMoveDown !== true
    || mutationPending
  const moveUpDisabled = !facts
    || facts.canMoveUp !== true
    || mutationPending
  const mutationMessage = mutationStatus.message
  const deleteTitle = facts?.canBeDeleted === true
    ? "Delete selected node"
    : "Selected node cannot be deleted"
  const duplicateTitle = facts?.canBeDuplicated === true
    ? "Duplicate selected node"
    : "Selected node cannot be duplicated"
  const moveDownTitle = facts?.canMoveDown === true
    ? "Move selected node down"
    : "Selected node cannot move down"
  const moveUpTitle = facts?.canMoveUp === true
    ? "Move selected node up"
    : "Selected node cannot move up"

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
              <span>{mutationStatus.command === "node.duplicate" && mutationPending ? "Duplicating" : "Duplicate"}</span>
            </button>
            <button
              className="tool-button inspector-action-button inspector-action-button--danger"
              disabled={deleteDisabled}
              onClick={() => onDeleteNode(facts.id)}
              title={deleteTitle}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              <span>{mutationStatus.command === "node.delete" && mutationPending ? "Deleting" : "Delete"}</span>
            </button>
            <div className="inspector-action-row" aria-label="Node order actions">
              <button
                aria-label="Move selected node up"
                className="icon-button"
                disabled={moveUpDisabled}
                onClick={() => onReorderNode(facts.id, "up")}
                title={moveUpTitle}
                type="button"
              >
                <ArrowUp aria-hidden="true" size={16} />
              </button>
              <button
                aria-label="Move selected node down"
                className="icon-button"
                disabled={moveDownDisabled}
                onClick={() => onReorderNode(facts.id, "down")}
                title={moveDownTitle}
                type="button"
              >
                <ArrowDown aria-hidden="true" size={16} />
              </button>
            </div>
            {mutationMessage ? (
              <p className="inspector-action-status" data-status={mutationStatus.status}>
                {mutationMessage}
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
              <dt>Move Up</dt>
              <dd>{capabilityLabel(facts.canMoveUp)}</dd>
            </div>
            <div>
              <dt>Move Down</dt>
              <dd>{capabilityLabel(facts.canMoveDown)}</dd>
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
