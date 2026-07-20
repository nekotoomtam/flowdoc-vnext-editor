import type {
  VNextPublishedStructureTestInputProjectionV1,
  VNextTestInputCollectionItemFieldProjectionV1,
  VNextTestInputValueTypeV1,
} from "../../core/coreAdapter"

export const REALDOC_E54_MAX_COLLECTION_ITEMS = 100
export const REALDOC_E54_MAX_IMAGE_BYTES = 10 * 1024 * 1024

export type TestInputScalarValue = string | boolean | null

export interface TestInputImageSelection {
  selectionId: string
  fileName: string
  mediaType: "image/png" | "image/jpeg"
  byteLength: number
  lastModified: number
  trustedAssetId?: string
  sha256?: string
}

export type TestInputEditableValue =
  | { valueType: "text" | "number" | "date" | "enum"; value: string | null }
  | { valueType: "boolean"; value: boolean | null }
  | { valueType: "image"; value: TestInputImageSelection | null }

export interface TestInputCollectionItemState {
  rowId: string
  itemKey: string
  values: Record<string, TestInputEditableValue>
}

export interface TestInputCollectionState {
  included: boolean
  items: TestInputCollectionItemState[]
}

export interface TestInputProjectionPins {
  owner: {
    structureId: string
    structureVersionId: string
    versionOrdinal: number
  }
  structureFingerprint: string
  dataContractFingerprint: string
  projectionFingerprint: string
}

export interface TestInputFormState {
  contractVersion: 1
  kind: "editor-test-input-form-state"
  status: "ready"
  storage: "memory-only"
  projectionPins: TestInputProjectionPins
  revision: number
  dirty: boolean
  documentValues: Record<string, TestInputEditableValue>
  collections: Record<string, TestInputCollectionState>
  execution: {
    snapshotCreation: "not-run"
    validation: "not-run"
    materialization: "not-run"
    artifact: "not-run"
  }
}

export type TestInputFormIssueCode =
  | "projection-stale"
  | "field-unknown"
  | "field-kind-mismatch"
  | "value-type-mismatch"
  | "image-selection-invalid"
  | "image-asset-not-trusted"
  | "form-import-invalid"
  | "form-import-too-large"
  | "collection-unknown"
  | "collection-row-limit"
  | "collection-item-unknown"
  | "collection-item-key-invalid"
  | "collection-item-key-duplicate"

export interface TestInputFormIssue {
  code: TestInputFormIssueCode
  path: string
  message: string
}

export type TestInputFormCommand =
  | { kind: "document-value.set"; fieldKey: string; value: TestInputScalarValue }
  | { kind: "document-image.set"; fieldKey: string; selection: TestInputImageSelection | null }
  | { kind: "collection.inclusion.set"; fieldKey: string; included: boolean }
  | { kind: "collection-item.add"; fieldKey: string; rowId: string }
  | { kind: "collection-item.remove"; fieldKey: string; rowId: string }
  | { kind: "collection-item-key.set"; fieldKey: string; rowId: string; itemKey: string }
  | {
      kind: "collection-item-value.set"
      fieldKey: string
      rowId: string
      itemFieldKey: string
      value: TestInputScalarValue
    }
  | {
      kind: "collection-item-image.set"
      fieldKey: string
      rowId: string
      itemFieldKey: string
      selection: TestInputImageSelection | null
    }
  | { kind: "form.reset" }

export type TestInputFormCommandResult =
  | { status: "applied"; state: TestInputFormState; issue: null }
  | { status: "blocked"; state: TestInputFormState; issue: TestInputFormIssue }

function editableValue(valueType: Exclude<VNextTestInputValueTypeV1, "collection">): TestInputEditableValue {
  if (valueType === "boolean") return { valueType, value: null }
  if (valueType === "image") return { valueType, value: null }
  return { valueType, value: null }
}

function createCollectionItemValues(
  fields: readonly VNextTestInputCollectionItemFieldProjectionV1[],
): Record<string, TestInputEditableValue> {
  return Object.fromEntries(fields.map((field) => [field.key, editableValue(field.valueType)]))
}

export function createTestInputProjectionPins(
  projection: VNextPublishedStructureTestInputProjectionV1,
): TestInputProjectionPins {
  return {
    owner: { ...projection.owner },
    structureFingerprint: projection.structureFingerprint,
    dataContractFingerprint: projection.dataContract.dataContractFingerprint,
    projectionFingerprint: projection.projectionFingerprint,
  }
}

export function testInputProjectionPinsMatch(
  pins: TestInputProjectionPins,
  projection: VNextPublishedStructureTestInputProjectionV1,
): boolean {
  return pins.owner.structureId === projection.owner.structureId
    && pins.owner.structureVersionId === projection.owner.structureVersionId
    && pins.owner.versionOrdinal === projection.owner.versionOrdinal
    && pins.structureFingerprint === projection.structureFingerprint
    && pins.dataContractFingerprint === projection.dataContract.dataContractFingerprint
    && pins.projectionFingerprint === projection.projectionFingerprint
}

export function createTestInputFormState(
  projection: VNextPublishedStructureTestInputProjectionV1,
): TestInputFormState {
  const documentValues: Record<string, TestInputEditableValue> = {}
  const collections: Record<string, TestInputCollectionState> = {}

  for (const field of projection.fields) {
    if (field.valueType === "collection") {
      collections[field.key] = { included: false, items: [] }
    } else {
      documentValues[field.key] = editableValue(field.valueType)
    }
  }

  return {
    contractVersion: 1,
    kind: "editor-test-input-form-state",
    status: "ready",
    storage: "memory-only",
    projectionPins: createTestInputProjectionPins(projection),
    revision: 0,
    dirty: false,
    documentValues,
    collections,
    execution: {
      snapshotCreation: "not-run",
      validation: "not-run",
      materialization: "not-run",
      artifact: "not-run",
    },
  }
}

export function reconcileTestInputFormState(
  state: TestInputFormState,
  projection: VNextPublishedStructureTestInputProjectionV1,
): TestInputFormState {
  return testInputProjectionPinsMatch(state.projectionPins, projection)
    ? state
    : createTestInputFormState(projection)
}

function issue(
  state: TestInputFormState,
  code: TestInputFormIssueCode,
  path: string,
  message: string,
): TestInputFormCommandResult {
  return { status: "blocked", state, issue: { code, path, message } }
}

function applied(state: TestInputFormState): TestInputFormCommandResult {
  return {
    status: "applied",
    state: { ...state, revision: state.revision + 1, dirty: true },
    issue: null,
  }
}

function validImageSelection(selection: TestInputImageSelection | null): boolean {
  if (selection == null) return true
  return selection.selectionId.trim().length > 0
    && selection.fileName.trim().length > 0
    && (selection.mediaType === "image/png" || selection.mediaType === "image/jpeg")
    && Number.isSafeInteger(selection.byteLength)
    && selection.byteLength > 0
    && selection.byteLength <= REALDOC_E54_MAX_IMAGE_BYTES
    && Number.isSafeInteger(selection.lastModified)
    && selection.lastModified >= 0
}

function scalarMatches(value: TestInputScalarValue, valueType: TestInputEditableValue["valueType"]): boolean {
  if (value == null) return valueType !== "image"
  if (valueType === "boolean") return typeof value === "boolean"
  return valueType !== "image" && typeof value === "string"
}

function nextItemKey(collection: TestInputCollectionState): string {
  const existing = new Set(collection.items.map((item) => item.itemKey))
  let ordinal = 1
  while (existing.has(`item-${ordinal}`)) ordinal += 1
  return `item-${ordinal}`
}

export function applyTestInputFormCommand(
  state: TestInputFormState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  command: TestInputFormCommand,
): TestInputFormCommandResult {
  if (!testInputProjectionPinsMatch(state.projectionPins, projection)) {
    return issue(state, "projection-stale", "projectionPins", "The test input projection changed.")
  }

  if (command.kind === "form.reset") {
    return {
      status: "applied",
      state: { ...createTestInputFormState(projection), revision: state.revision + 1 },
      issue: null,
    }
  }

  const field = projection.fields.find((candidate) => candidate.key === command.fieldKey)
  if (!field) return issue(state, "field-unknown", "fieldKey", "The field is not part of this projection.")

  if (command.kind === "document-value.set" || command.kind === "document-image.set") {
    const currentValue = state.documentValues[field.key]
    if (!currentValue) {
      return issue(state, "field-kind-mismatch", "fieldKey", "The field does not accept a document value.")
    }

    if (command.kind === "document-value.set") {
      if (!scalarMatches(command.value, currentValue.valueType)) {
        return issue(state, "value-type-mismatch", `documentValues.${field.key}`, "The value type does not match the field.")
      }
      return applied({
        ...state,
        documentValues: {
          ...state.documentValues,
          [field.key]: { ...currentValue, value: command.value } as TestInputEditableValue,
        },
      })
    }

    if (currentValue.valueType !== "image" || field.imageAssetInput == null) {
      return issue(state, "field-kind-mismatch", "fieldKey", "The field does not accept an image selection.")
    }
    if (!validImageSelection(command.selection)) {
      return issue(state, "image-selection-invalid", `documentValues.${field.key}`, "Select a PNG or JPEG image within the local size limit.")
    }
    return applied({
      ...state,
      documentValues: {
        ...state.documentValues,
        [field.key]: { ...currentValue, value: command.selection },
      },
    })
  }

  const collection = state.collections[field.key]
  if (!collection || field.valueType !== "collection" || field.collection == null) {
    return issue(state, "collection-unknown", "fieldKey", "The field is not an editable collection.")
  }

  if (command.kind === "collection.inclusion.set") {
    return applied({
      ...state,
      collections: {
        ...state.collections,
        [field.key]: { ...collection, included: command.included },
      },
    })
  }

  if (command.kind === "collection-item.add") {
    if (collection.items.length >= REALDOC_E54_MAX_COLLECTION_ITEMS) {
      return issue(state, "collection-row-limit", `collections.${field.key}`, "The local collection row limit was reached.")
    }
    if (command.rowId.trim().length === 0 || collection.items.some((item) => item.rowId === command.rowId)) {
      return issue(state, "collection-item-key-invalid", `collections.${field.key}`, "The local row identity is invalid.")
    }
    const item: TestInputCollectionItemState = {
      rowId: command.rowId,
      itemKey: nextItemKey(collection),
      values: createCollectionItemValues(field.collection.itemFields),
    }
    return applied({
      ...state,
      collections: {
        ...state.collections,
        [field.key]: { included: true, items: [...collection.items, item] },
      },
    })
  }

  const itemIndex = collection.items.findIndex((item) => item.rowId === command.rowId)
  if (itemIndex < 0) {
    return issue(state, "collection-item-unknown", `collections.${field.key}`, "The collection item is not available.")
  }

  if (command.kind === "collection-item.remove") {
    return applied({
      ...state,
      collections: {
        ...state.collections,
        [field.key]: {
          ...collection,
          items: collection.items.filter((item) => item.rowId !== command.rowId),
        },
      },
    })
  }

  const currentItem = collection.items[itemIndex]
  if (!currentItem) {
    return issue(state, "collection-item-unknown", `collections.${field.key}`, "The collection item is not available.")
  }

  if (command.kind === "collection-item-key.set") {
    const itemKey = command.itemKey.trim()
    if (itemKey.length === 0) {
      return issue(state, "collection-item-key-invalid", `collections.${field.key}.itemKey`, "Item key is required.")
    }
    if (collection.items.some((item) => item.rowId !== command.rowId && item.itemKey === itemKey)) {
      return issue(state, "collection-item-key-duplicate", `collections.${field.key}.itemKey`, "Item key must be unique within the collection.")
    }
    const items = [...collection.items]
    items[itemIndex] = { ...currentItem, itemKey }
    return applied({
      ...state,
      collections: { ...state.collections, [field.key]: { ...collection, items } },
    })
  }

  const itemField = field.collection.itemFields.find((candidate) => candidate.key === command.itemFieldKey)
  const currentValue = currentItem.values[command.itemFieldKey]
  if (!itemField || !currentValue) {
    return issue(state, "field-unknown", `collections.${field.key}.values`, "The item field is not part of this projection.")
  }

  let nextValue: TestInputEditableValue
  if (command.kind === "collection-item-value.set") {
    if (!scalarMatches(command.value, currentValue.valueType)) {
      return issue(state, "value-type-mismatch", `collections.${field.key}.values.${itemField.key}`, "The value type does not match the item field.")
    }
    nextValue = { ...currentValue, value: command.value } as TestInputEditableValue
  } else {
    if (currentValue.valueType !== "image" || itemField.imageAssetInput == null) {
      return issue(state, "field-kind-mismatch", `collections.${field.key}.values.${itemField.key}`, "The item field does not accept an image selection.")
    }
    if (!validImageSelection(command.selection)) {
      return issue(state, "image-selection-invalid", `collections.${field.key}.values.${itemField.key}`, "Select a PNG or JPEG image within the local size limit.")
    }
    nextValue = { ...currentValue, value: command.selection }
  }

  const items = [...collection.items]
  items[itemIndex] = {
    ...currentItem,
    values: { ...currentItem.values, [itemField.key]: nextValue },
  }
  return applied({
    ...state,
    collections: { ...state.collections, [field.key]: { ...collection, items } },
  })
}
