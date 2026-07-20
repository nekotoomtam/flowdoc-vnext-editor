import {
  CheckCircle2,
  CircleAlert,
  Download,
  FileJson,
  FileOutput,
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
  PreviewTestInputInteraction,
  PreviewTestInputJsonInteraction,
} from "../../app/usePreviewTestInput"
import type {
  TestInputEditableValue,
  TestInputImageSelection,
  TestInputScalarValue,
} from "../../editor/preview/testInputFormState"
import {
  testInputMappingProfileMatchesProjection,
  testInputMappingProfileOptionKey,
} from "../../editor/preview/testInputJsonState"
import { stringifyTestInputFormDataJsonDraft } from "../../editor/preview/testInputFormDataJson"
import type { PublishedPreviewGenerationInteraction } from "../../app/usePublishedPreviewGeneration"

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

function formatBytes(byteLength: number): string {
  if (byteLength < 1024) return `${byteLength} B`
  return `${(byteLength / 1024).toFixed(byteLength < 10 * 1024 ? 1 : 0)} KiB`
}

function JsonInputPane({
  interaction,
  projection,
}: {
  interaction: PreviewTestInputJsonInteraction
  projection: VNextPublishedStructureTestInputProjectionV1
}) {
  const { diagnostics, state } = interaction
  if (!state || !diagnostics) return null
  const selectionKey = state.mappingProfile == null
    ? ""
    : JSON.stringify([
        state.mappingProfile.mappingProfileId,
        state.mappingProfile.mappingProfileVersion,
        state.mappingProfile.profileFingerprint,
      ])
  const selectedOption = interaction.mappingProfiles.find((option) => (
    testInputMappingProfileOptionKey(option) === selectionKey
  ))
  const statusLabel = diagnostics.status === "ready-for-admission"
    ? "Ready"
    : diagnostics.status === "blocked" ? "Blocked" : "Incomplete"

  return (
    <div className="test-input-json-scroll">
      <section className="test-input-json-section">
        <div className="test-input-json-heading">
          <div>
            <strong>JSON payload</strong>
            <span>{formatBytes(diagnostics.summary.payloadByteLength)} / 1 MiB</span>
          </div>
          <input
            accept=".json,application/json,text/json"
            className="test-input-file-input"
            id="test-input-json-file"
            onChange={(event) => {
              void interaction.selectFile(event.currentTarget.files?.[0] ?? null)
              event.currentTarget.value = ""
            }}
            type="file"
          />
          <label className="tool-button test-input-file-button" htmlFor="test-input-json-file">
            <FileJson aria-hidden="true" size={16} />
            <span>Choose JSON</span>
          </label>
        </div>
        {state.payloadSource.kind === "file" ? (
          <div className="test-input-json-file-summary">
            <span title={state.payloadSource.file.fileName}>{state.payloadSource.file.fileName}</span>
            <button
              aria-label="Clear JSON payload"
              className="icon-button test-input-clear-button"
              onClick={interaction.clearPayload}
              title="Clear JSON payload"
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ) : null}
        <textarea
          aria-label="JSON payload"
          className="test-input-json-editor"
          onChange={(event) => interaction.setPayloadText(event.currentTarget.value)}
          placeholder="{}"
          spellCheck={false}
          value={state.payloadText}
        />
      </section>

      <section className="test-input-json-section">
        <div className="test-input-json-heading">
          <div>
            <strong>Mapping profile</strong>
            <span>Exact version</span>
          </div>
        </div>
        <select
          aria-label="Mapping profile"
          className="test-input-select"
          onChange={(event) => interaction.selectMappingProfile(event.currentTarget.value || null)}
          value={selectionKey}
        >
          <option value="">Select profile</option>
          {interaction.mappingProfiles.map((option) => (
            <option
              disabled={!testInputMappingProfileMatchesProjection(option, projection)}
              key={testInputMappingProfileOptionKey(option)}
              value={testInputMappingProfileOptionKey(option)}
            >
              {option.label} (v{option.profile.mappingProfileVersion})
            </option>
          ))}
        </select>
        {selectedOption ? (
          <dl className="test-input-profile-facts">
            <div><dt>Profile</dt><dd>{selectedOption.profile.mappingProfileId}</dd></div>
            <div>
              <dt>Source</dt>
              <dd>
                {selectedOption.profile.sourceContract.sourceContractId}
                {` v${selectedOption.profile.sourceContract.sourceContractVersion}`}
              </dd>
            </div>
            <div><dt>Execution</dt><dd>{selectedOption.profile.execution.kind}</dd></div>
          </dl>
        ) : null}
      </section>

      <section className="test-input-json-section test-input-json-diagnostics">
        <div className="test-input-json-heading">
          <div>
            <strong>Local checks</strong>
            <span data-status={diagnostics.status}>{statusLabel}</span>
          </div>
        </div>
        {diagnostics.issues.length === 0 ? (
          <div className="test-input-diagnostic-row" data-severity="ready">
            <CheckCircle2 aria-hidden="true" size={16} />
            <span>JSON and profile are ready for admission.</span>
          </div>
        ) : diagnostics.issues.map((item) => (
          <div className="test-input-diagnostic-row" data-severity={item.severity} key={`${item.code}:${item.path}`}>
            <CircleAlert aria-hidden="true" size={16} />
            <span>{item.message}</span>
          </div>
        ))}
        <div className="test-input-execution-row">
          <span>Mapping</span>
          <strong>Not run</strong>
        </div>
      </section>
    </div>
  )
}

export interface PreviewTestInputViewProps {
  document: CoreEditorDocumentSummary
  interaction: PreviewTestInputInteraction
  publishedPreview?: PublishedPreviewGenerationInteraction | null
  previewTarget?: "draft" | "published"
  previewTargetAvailability?: { draft: boolean; published: boolean }
  onSelectPreviewTarget?: (target: "draft" | "published") => void
  projection: VNextPublishedStructureTestInputProjectionV1
}

function PublishedPreviewSurface({
  document,
  interaction,
}: {
  document: CoreEditorDocumentSummary
  interaction: PublishedPreviewGenerationInteraction | null | undefined
}) {
  if (!interaction) return (
    <div className="test-input-preview-paper">
      <FileText aria-hidden="true" size={30} strokeWidth={1.5} />
      <strong>{document.title}</strong>
      <span>Exact preview not generated</span>
    </div>
  )
  const receipt = interaction.receipt
  const targetLabel = interaction.target === "draft" ? "Draft Preview" : "Published Preview"
  const status = interaction.stale
    ? "Stale result"
    : interaction.phase === "idle"
      ? "Exact preview not generated"
      : interaction.phase === "admitting"
        ? "Mapping and validating"
        : interaction.phase === "requesting"
          ? "Preparing PDF operation"
          : interaction.phase === "running"
            ? "Generating exact PDF"
            : interaction.phase === "completed"
              ? "Exact PDF ready"
              : "Preview failed"
  return (
    <div className="published-preview-result" data-phase={interaction.phase} data-stale={interaction.stale}>
      <div className="published-preview-status-bar">
        <div>
          <strong>{status}</strong>
          <span>{interaction.operation?.pageCount ? `${targetLabel} · ${interaction.operation.pageCount} pages` : targetLabel}</span>
        </div>
        {interaction.operation?.state === "completed" && !interaction.stale ? (
          <button className="tool-button" onClick={interaction.download} type="button">
            <Download aria-hidden="true" size={15} />
            <span>Download</span>
          </button>
        ) : null}
      </div>
      {receipt ? (
        <dl className="published-preview-mapped-result">
          <div><dt>Mapped result</dt><dd>{receipt.execution.mapping}</dd></div>
          <div><dt>Validation</dt><dd>{receipt.execution.runtimeValidation}</dd></div>
          <div><dt>Warnings</dt><dd>{receipt.diagnostics.summary.warningCount}</dd></div>
          <div title={receipt.canonicalInputFingerprint}>
            <dt>Canonical</dt><dd>{receipt.canonicalInputFingerprint.slice(7, 19)}</dd>
          </div>
        </dl>
      ) : null}
      {interaction.artifactUrl ? (
        <iframe
          className="published-preview-pdf"
          src={interaction.artifactUrl}
          title={`${document.title} exact ${targetLabel} PDF`}
        />
      ) : (
        <div className="test-input-preview-paper published-preview-placeholder">
          <FileText aria-hidden="true" size={30} strokeWidth={1.5} />
          <strong>{document.title}</strong>
          <span>{status}</span>
          {interaction.error ? <span className="published-preview-error">{interaction.error}</span> : null}
        </div>
      )}
    </div>
  )
}

export function PreviewTestInputView({
  document,
  interaction,
  publishedPreview,
  previewTarget = "published",
  previewTargetAvailability = { draft: false, published: true },
  onSelectPreviewTarget,
  projection,
}: PreviewTestInputViewProps) {
  const formInteraction = interaction.form
  if (!formInteraction.state || !interaction.json.state) return null
  const fieldByKey = new Map(projection.fields.map((field) => [field.key, field]))
  const activeRevision = interaction.mode === "form"
    ? formInteraction.state.revision
    : interaction.json.state.revision
  const activeDirty = interaction.mode === "form"
    ? formInteraction.state.dirty
    : interaction.json.state.dirty
  const activeIssue = interaction.mode === "form" ? formInteraction.lastIssue : interaction.json.lastIssue

  return (
    <main className="test-input-preview" aria-label="Document Preview test input">
      <div className="test-input-toolbar">
        <div>
          <strong>Test data</strong>
          <span>Memory only</span>
        </div>
        <div aria-label="Preview target" className="segmented-control preview-target-control" role="group">
          {(["draft", "published"] as const).map((target) => (
            <button
              aria-pressed={previewTarget === target}
              className="segmented-button"
              data-active={previewTarget === target}
              disabled={!previewTargetAvailability[target]}
              key={target}
              onClick={() => onSelectPreviewTarget?.(target)}
              type="button"
            >
              {target === "draft" ? "Draft" : "Published"}
            </button>
          ))}
        </div>
        <div className="test-input-toolbar-actions">
          <span className="test-input-revision">Revision {activeRevision}</span>
          {publishedPreview ? (
            <button
              className="tool-button published-preview-generate"
              disabled={!publishedPreview.canGenerate}
              onClick={publishedPreview.generate}
              type="button"
            >
              <FileOutput aria-hidden="true" size={15} />
              <span>{publishedPreview.stale || publishedPreview.phase === "completed" ? "Generate again" : "Generate PDF"}</span>
            </button>
          ) : null}
          <button
            aria-label="Reset test data"
            className="icon-button"
            disabled={!activeDirty}
            onClick={interaction.resetActive}
            title="Reset test data"
            type="button"
          >
            <RotateCcw aria-hidden="true" size={15} />
          </button>
        </div>
      </div>
      <div className="test-input-workspace">
        <aside className="test-input-pane" aria-label="Test input">
          <div className="test-input-mode-bar">
            <div aria-label="Test input mode" className="segmented-control" role="group">
              {(["form", "json"] as const).map((mode) => (
                <button
                  aria-pressed={interaction.mode === mode}
                  className="segmented-button"
                  data-active={interaction.mode === mode}
                  key={mode}
                  onClick={() => interaction.setMode(mode)}
                  type="button"
                >
                  {mode === "form" ? "Form" : "JSON"}
                </button>
              ))}
            </div>
          </div>
          {activeIssue ? (
            <div aria-live="polite" className="test-input-issue" role="status">
              {activeIssue.message}
            </div>
          ) : null}
          {interaction.mode === "form" ? <div className="test-input-form-scroll">
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
                    ? <CollectionField field={field} interaction={formInteraction} key={field.key} />
                    : <DocumentField field={field} interaction={formInteraction} key={field.key} />
                })}
              </section>
            ))}
            <section className="test-input-form-json-draft">
              <div className="test-input-group-heading">
                <strong>Form data JSON</strong>
                <span>Draft, not validated</span>
              </div>
              <textarea
                aria-label="Form data JSON draft"
                className="test-input-json-editor"
                readOnly
                spellCheck={false}
                value={stringifyTestInputFormDataJsonDraft(formInteraction.state)}
              />
            </section>
          </div> : (
            <JsonInputPane interaction={interaction.json} projection={projection} />
          )}
        </aside>
        <section className="test-input-preview-surface" aria-label="Exact preview status">
          <PublishedPreviewSurface document={document} interaction={publishedPreview} />
        </section>
      </div>
    </main>
  )
}
