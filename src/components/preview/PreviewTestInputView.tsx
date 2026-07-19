import {
  FileText,
  ImagePlus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react"
import type {
  VNextPublishedStructureTestInputProjectionV1,
  VNextTestInputCollectionItemFieldProjectionV1,
  VNextTestInputDocumentFieldProjectionV1,
} from "../../core/coreAdapter"
import type { CoreEditorDocumentSummary } from "../../core/coreTypes"
import type { PreviewTestInputFormInteraction } from "../../app/usePreviewTestInputForm"
import type {
  TestInputEditableValue,
  TestInputImageSelection,
  TestInputScalarValue,
} from "../../editor/preview/testInputFormState"

type EditableFieldProjection =
  | VNextTestInputDocumentFieldProjectionV1
  | VNextTestInputCollectionItemFieldProjectionV1

interface EditableFieldControlProps {
  controlId: string
  field: EditableFieldProjection
  value: TestInputEditableValue
  onImageChange: (file: File | null) => void
  onValueChange: (value: TestInputScalarValue) => void
}

function RequirementLabel({ field }: { field: EditableFieldProjection }) {
  const required = field.constraints.required
  const label = required.status === "available"
    ? required.value ? "Required" : "Optional"
    : "Requirement unavailable"
  return <span className="test-input-field-fact">{label}</span>
}

function ClearValueButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      aria-label={`Clear ${label}`}
      className="icon-button test-input-clear-button"
      onClick={onClear}
      title={`Clear ${label}`}
      type="button"
    >
      <X aria-hidden="true" size={14} />
    </button>
  )
}

function ImageFieldControl({
  controlId,
  field,
  selection,
  onImageChange,
}: {
  controlId: string
  field: EditableFieldProjection
  selection: TestInputImageSelection | null
  onImageChange: (file: File | null) => void
}) {
  return (
    <div className="test-input-image-control">
      <input
        accept="image/png,image/jpeg"
        className="test-input-file-input"
        id={controlId}
        onChange={(event) => {
          onImageChange(event.currentTarget.files?.[0] ?? null)
          event.currentTarget.value = ""
        }}
        type="file"
      />
      <label className="tool-button test-input-file-button" htmlFor={controlId}>
        <ImagePlus aria-hidden="true" size={16} />
        <span>{selection ? "Replace image" : "Choose image"}</span>
      </label>
      {selection ? (
        <>
          <span className="test-input-file-name" title={selection.fileName}>{selection.fileName}</span>
          <ClearValueButton label={field.label} onClear={() => onImageChange(null)} />
        </>
      ) : (
        <span className="test-input-value-status">Unset</span>
      )}
    </div>
  )
}

function EditableFieldControl({
  controlId,
  field,
  value,
  onImageChange,
  onValueChange,
}: EditableFieldControlProps) {
  if (value.valueType === "image") {
    return (
      <ImageFieldControl
        controlId={controlId}
        field={field}
        onImageChange={onImageChange}
        selection={value.value}
      />
    )
  }

  if (value.valueType === "boolean") {
    return (
      <div aria-label={field.label} className="segmented-control test-input-boolean-control" role="group">
        {([
          [null, "Unset"],
          [true, "Yes"],
          [false, "No"],
        ] as const).map(([nextValue, label]) => (
          <button
            aria-pressed={value.value === nextValue}
            className="segmented-button"
            data-active={value.value === nextValue}
            key={label}
            onClick={() => onValueChange(nextValue)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    )
  }

  const allowedValues = field.constraints.allowedValues
  const useSelect = value.valueType === "enum" && allowedValues.status === "available"
  const currentValue = value.value ?? ""

  return (
    <div className="test-input-scalar-control">
      {useSelect ? (
        <select
          aria-label={field.label}
          className="test-input-select"
          id={controlId}
          onChange={(event) => onValueChange(event.currentTarget.value || null)}
          value={currentValue}
        >
          <option value="">Unset</option>
          {allowedValues.values.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          aria-label={field.label}
          className="test-input-text-input"
          id={controlId}
          inputMode={value.valueType === "number" ? "decimal" : undefined}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          type="text"
          value={currentValue}
        />
      )}
      {value.value == null ? (
        <span className="test-input-value-status">Unset</span>
      ) : (
        <ClearValueButton label={field.label} onClear={() => onValueChange(null)} />
      )}
    </div>
  )
}

function FieldLabel({ field, controlId }: { field: EditableFieldProjection; controlId: string }) {
  return (
    <div className="test-input-field-heading">
      <label htmlFor={controlId}>{field.label}</label>
      <span className="test-input-field-type">{field.valueType}</span>
      <RequirementLabel field={field} />
    </div>
  )
}

function DocumentField({
  field,
  interaction,
}: {
  field: VNextTestInputDocumentFieldProjectionV1
  interaction: PreviewTestInputFormInteraction
}) {
  const value = interaction.state?.documentValues[field.key]
  if (!value) return null
  const controlId = `test-input-document-${field.key}`

  return (
    <div className="test-input-field" data-field-key={field.key}>
      <FieldLabel controlId={controlId} field={field} />
      <EditableFieldControl
        controlId={controlId}
        field={field}
        onImageChange={(file) => interaction.setDocumentImage(field.key, file)}
        onValueChange={(nextValue) => interaction.setDocumentValue(field.key, nextValue)}
        value={value}
      />
    </div>
  )
}

function CollectionField({
  field,
  interaction,
}: {
  field: VNextTestInputDocumentFieldProjectionV1
  interaction: PreviewTestInputFormInteraction
}) {
  const collection = interaction.state?.collections[field.key]
  if (!collection || !field.collection) return null

  return (
    <section className="test-input-collection" data-field-key={field.key}>
      <div className="test-input-collection-heading">
        <div>
          <strong>{field.label}</strong>
          <span>{collection.items.length} items</span>
        </div>
        <label className="test-input-checkbox-label">
          <input
            checked={collection.included}
            onChange={(event) => interaction.setCollectionIncluded(field.key, event.currentTarget.checked)}
            type="checkbox"
          />
          Include
        </label>
      </div>
      {collection.included ? (
        <>
          <div className="test-input-collection-toolbar">
            <span className="test-input-field-fact">Ordered by item position</span>
            <button
              className="tool-button"
              onClick={() => interaction.addCollectionItem(field.key)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              <span>Add item</span>
            </button>
          </div>
          {collection.items.length === 0 ? (
            <div className="test-input-empty-collection">Included, empty collection</div>
          ) : null}
          <div className="test-input-collection-items">
            {collection.items.map((item, itemIndex) => (
              <section className="test-input-collection-item" key={item.rowId}>
                <div className="test-input-collection-item-heading">
                  <strong>Item {itemIndex + 1}</strong>
                  <button
                    aria-label={`Remove item ${itemIndex + 1}`}
                    className="icon-button"
                    onClick={() => interaction.removeCollectionItem(field.key, item.rowId)}
                    title={`Remove item ${itemIndex + 1}`}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
                <div className="test-input-field">
                  <div className="test-input-field-heading">
                    <label htmlFor={`${field.key}-${item.rowId}-item-key`}>Item key</label>
                    <span className="test-input-field-fact">Required, unique</span>
                  </div>
                  <input
                    className="test-input-text-input"
                    id={`${field.key}-${item.rowId}-item-key`}
                    onChange={(event) => interaction.setCollectionItemKey(field.key, item.rowId, event.currentTarget.value)}
                    type="text"
                    value={item.itemKey}
                  />
                </div>
                {field.collection?.itemFields.map((itemField) => {
                  const value = item.values[itemField.key]
                  if (!value) return null
                  const controlId = `${field.key}-${item.rowId}-${itemField.key}`
                  return (
                    <div className="test-input-field" data-field-key={itemField.key} key={itemField.key}>
                      <FieldLabel controlId={controlId} field={itemField} />
                      <EditableFieldControl
                        controlId={controlId}
                        field={itemField}
                        onImageChange={(file) => interaction.setCollectionItemImage(
                          field.key,
                          item.rowId,
                          itemField.key,
                          file,
                        )}
                        onValueChange={(nextValue) => interaction.setCollectionItemValue(
                          field.key,
                          item.rowId,
                          itemField.key,
                          nextValue,
                        )}
                        value={value}
                      />
                    </div>
                  )
                })}
              </section>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

export interface PreviewTestInputViewProps {
  document: CoreEditorDocumentSummary
  interaction: PreviewTestInputFormInteraction
  projection: VNextPublishedStructureTestInputProjectionV1
}

export function PreviewTestInputView({
  document,
  interaction,
  projection,
}: PreviewTestInputViewProps) {
  if (!interaction.state) return null
  const fieldByKey = new Map(projection.fields.map((field) => [field.key, field]))

  return (
    <main className="test-input-preview" aria-label="Document Preview test input">
      <div className="test-input-toolbar">
        <div>
          <strong>Test data</strong>
          <span>Memory only</span>
        </div>
        <div className="test-input-toolbar-actions">
          <span className="test-input-revision">Revision {interaction.state.revision}</span>
          <button
            aria-label="Reset test data"
            className="icon-button"
            disabled={!interaction.state.dirty}
            onClick={interaction.reset}
            title="Reset test data"
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
          </button>
        </div>
      </div>
      <div className="test-input-workspace">
        <aside className="test-input-pane" aria-label="Test input form">
          {interaction.lastIssue ? (
            <div aria-live="polite" className="test-input-issue" role="status">
              {interaction.lastIssue.message}
            </div>
          ) : null}
          <div className="test-input-form-scroll">
            {projection.groups.map((group) => (
              <section className="test-input-group" key={group.groupId}>
                <div className="test-input-group-heading">
                  <strong>{group.kind === "unplaced" ? "Not placed" : `Section ${group.sectionIndex + 1}`}</strong>
                  <span>{group.fieldKeys.length} fields</span>
                </div>
                {group.fieldKeys.map((fieldKey) => {
                  const field = fieldByKey.get(fieldKey)
                  if (!field) return null
                  return field.valueType === "collection"
                    ? <CollectionField field={field} interaction={interaction} key={field.key} />
                    : <DocumentField field={field} interaction={interaction} key={field.key} />
                })}
              </section>
            ))}
          </div>
        </aside>
        <section className="test-input-preview-surface" aria-label="Exact preview status">
          <div className="test-input-preview-paper">
            <FileText aria-hidden="true" size={30} strokeWidth={1.5} />
            <strong>{document.title}</strong>
            <span>Exact preview not generated</span>
          </div>
        </section>
      </div>
    </main>
  )
}
