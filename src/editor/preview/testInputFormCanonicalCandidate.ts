import type {
  DataSnapshotV2,
  DataSnapshotV2Value,
  ImageAssetRegistryV1,
  VNextPublishedStructureTestInputProjectionV1,
  VNextTableCollectionValueV1,
} from "../../core/coreAdapter"
import {
  DataSnapshotV2Schema,
  VNextTableCollectionValueV1Schema,
} from "../../core/coreAdapter"
import {
  createTestInputFormState,
  testInputProjectionPinsMatch,
  type TestInputEditableValue,
  type TestInputFormState,
} from "./testInputFormState"

export interface TestInputFormCanonicalCandidateIssue {
  code:
    | "projection-stale"
    | "form-field-unknown"
    | "form-field-kind-mismatch"
    | "form-number-invalid"
    | "form-image-not-trusted"
    | "form-collection-unknown"
  path: string
  message: string
}

export interface TestInputFormCanonicalCandidateSummary {
  scalarValueCount: number
  collectionCount: number
  collectionItemCount: number
  imageReferenceCount: number
}

export type TestInputFormCanonicalCandidate =
  | {
      contractVersion: 1
      kind: "editor-form-canonical-candidate"
      status: "ready-for-admission"
      data: DataSnapshotV2
      collections: Record<string, VNextTableCollectionValueV1>
      summary: TestInputFormCanonicalCandidateSummary
      issues: []
      contracts: {
        projectionOwnedFieldIdentity: true
        backendValidationRequired: true
        canonicalIdentityAssigned: false
        browserResolver: false
      }
    }
  | {
      contractVersion: 1
      kind: "editor-form-canonical-candidate"
      status: "blocked"
      data: null
      collections: null
      summary: TestInputFormCanonicalCandidateSummary
      issues: TestInputFormCanonicalCandidateIssue[]
      contracts: {
        projectionOwnedFieldIdentity: true
        backendValidationRequired: true
        canonicalIdentityAssigned: false
        browserResolver: false
      }
    }

const contracts = {
  projectionOwnedFieldIdentity: true as const,
  backendValidationRequired: true as const,
  canonicalIdentityAssigned: false as const,
  browserResolver: false as const,
}

function issue(
  code: TestInputFormCanonicalCandidateIssue["code"],
  path: string,
  message: string,
): TestInputFormCanonicalCandidateIssue {
  return { code, path, message }
}

function value(
  input: TestInputEditableValue,
  path: string,
  assets: ImageAssetRegistryV1,
): { present: false; issue: null } | { present: true; value: DataSnapshotV2Value; issue: null } | {
  present: false
  issue: TestInputFormCanonicalCandidateIssue
} {
  if (input.value == null) return { present: false, issue: null }
  if (input.valueType === "number") {
    const text = input.value.trim()
    if (text.length === 0) return { present: false, issue: null }
    const numeric = Number(text)
    return Number.isFinite(numeric)
      ? { present: true, value: numeric, issue: null }
      : { present: false, issue: issue("form-number-invalid", path, "Enter a finite number.") }
  }
  if (input.valueType === "image") {
    const assetId = input.value.trustedAssetId
    const trusted = assetId == null ? null : assets.images[assetId] ?? null
    if (
      trusted == null
      || input.value.sha256 !== trusted.digest.value
      || input.value.mediaType !== trusted.mediaType
      || input.value.byteLength !== trusted.byteLength
    ) return {
      present: false,
      issue: issue("form-image-not-trusted", path, "Select an image that matches an admitted asset."),
    }
    return { present: true, value: { kind: "image-asset-ref", assetId: trusted.id }, issue: null }
  }
  return { present: true, value: input.value, issue: null }
}

export function projectTestInputFormCanonicalCandidate(
  state: TestInputFormState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  assets: ImageAssetRegistryV1,
): TestInputFormCanonicalCandidate {
  const issues: TestInputFormCanonicalCandidateIssue[] = []
  const values: Record<string, DataSnapshotV2Value> = {}
  const collections: Record<string, VNextTableCollectionValueV1> = {}
  let collectionItemCount = 0
  let imageReferenceCount = 0

  if (!testInputProjectionPinsMatch(state.projectionPins, projection)) {
    issues.push(issue("projection-stale", "projectionPins", "The Form projection changed."))
  }
  const fields = new Map(projection.fields.map((field) => [field.key, field]))
  for (const [fieldKey, fieldValue] of Object.entries(state.documentValues)) {
    const field = fields.get(fieldKey)
    if (field == null) {
      issues.push(issue("form-field-unknown", `documentValues.${fieldKey}`, "The field is not in this projection."))
      continue
    }
    if (field.valueType === "collection" || field.valueType !== fieldValue.valueType) {
      issues.push(issue("form-field-kind-mismatch", `documentValues.${fieldKey}`, "The Form value does not match the projected field type."))
      continue
    }
    const projected = value(fieldValue, `documentValues.${fieldKey}`, assets)
    if (projected.issue != null) issues.push(projected.issue)
    else if (projected.present) {
      values[fieldKey] = projected.value
      if (fieldValue.valueType === "image") imageReferenceCount += 1
    }
  }

  for (const [fieldKey, collectionState] of Object.entries(state.collections)) {
    const field = fields.get(fieldKey)
    if (field?.valueType !== "collection" || field.collection == null) {
      issues.push(issue("form-collection-unknown", `collections.${fieldKey}`, "The collection is not in this projection."))
      continue
    }
    if (!collectionState.included) continue
    const items = collectionState.items.map((item, itemIndex) => {
      const itemValues: Record<string, DataSnapshotV2Value> = {}
      for (const [itemFieldKey, itemValue] of Object.entries(item.values)) {
        const itemField = field.collection!.itemFields.find((candidate) => candidate.key === itemFieldKey)
        const path = `collections.${fieldKey}.items[${itemIndex}].values.${itemFieldKey}`
        if (itemField == null) {
          issues.push(issue("form-field-unknown", path, "The collection item field is not in this projection."))
          continue
        }
        if (itemField.valueType !== itemValue.valueType) {
          issues.push(issue("form-field-kind-mismatch", path, "The Form value does not match the projected item field type."))
          continue
        }
        const projected = value(itemValue, path, assets)
        if (projected.issue != null) issues.push(projected.issue)
        else if (projected.present) {
          itemValues[itemFieldKey] = projected.value
          if (itemValue.valueType === "image") imageReferenceCount += 1
        }
      }
      return { itemKey: item.itemKey, values: itemValues }
    })
    collectionItemCount += items.length
    collections[fieldKey] = { collectionFieldKey: fieldKey, items }
  }

  const summary = {
    scalarValueCount: Object.keys(values).length,
    collectionCount: Object.keys(collections).length,
    collectionItemCount,
    imageReferenceCount,
  }
  if (issues.length > 0) return {
    contractVersion: 1,
    kind: "editor-form-canonical-candidate",
    status: "blocked",
    data: null,
    collections: null,
    summary,
    issues,
    contracts,
  }
  return {
    contractVersion: 1,
    kind: "editor-form-canonical-candidate",
    status: "ready-for-admission",
    data: { version: 2, values },
    collections,
    summary,
    issues: [],
    contracts,
  }
}

export function stringifyTestInputFormCanonicalCandidate(candidate: TestInputFormCanonicalCandidate): string {
  return JSON.stringify(candidate, null, 2)
}

export interface TestInputFormCanonicalImportIssue {
  code: "form-import-invalid"
  path: string
  message: string
}

export type TestInputFormCanonicalImportResult =
  | { status: "imported"; state: TestInputFormState; issues: [] }
  | { status: "blocked"; state: null; issues: TestInputFormCanonicalImportIssue[] }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function importIssue(path: string, message: string): TestInputFormCanonicalImportResult {
  return { status: "blocked", state: null, issues: [{ code: "form-import-invalid", path, message }] }
}

export function parseTestInputFormCanonicalJson(text: string): unknown {
  const normalized = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return JSON.parse(normalized) as unknown
}

function importedValue(
  raw: DataSnapshotV2Value,
  valueType: TestInputEditableValue["valueType"],
  assets: ImageAssetRegistryV1,
): TestInputEditableValue | null {
  if (raw === null) {
    return valueType === "boolean"
      ? { valueType, value: null }
      : valueType === "image"
        ? { valueType, value: null }
        : { valueType, value: null }
  }
  if (valueType === "number") {
    return typeof raw === "number" && Number.isFinite(raw) ? { valueType, value: String(raw) } : null
  }
  if (valueType === "boolean") return typeof raw === "boolean" ? { valueType, value: raw } : null
  if (valueType === "image") {
    if (!record(raw) || raw.kind !== "image-asset-ref" || typeof raw.assetId !== "string") return null
    const asset = assets.images[raw.assetId]
    if (asset == null) return null
    return {
      valueType,
      value: {
        selectionId: `trusted-asset:${asset.id}`,
        fileName: asset.id,
        mediaType: asset.mediaType,
        byteLength: asset.byteLength,
        lastModified: 0,
        trustedAssetId: asset.id,
        sha256: asset.digest.value,
      },
    }
  }
  return typeof raw === "string" ? { valueType, value: raw } : null
}

export function importTestInputFormCanonicalCandidate(
  current: TestInputFormState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  assets: ImageAssetRegistryV1,
  value: unknown,
): TestInputFormCanonicalImportResult {
  if (!record(value)) return importIssue("$", "Form JSON must be an object.")
  const candidate = value.kind === "canonical-data"
    ? value
    : value.kind === "editor-form-canonical-candidate" && value.status === "ready-for-admission"
      ? value
      : null
  if (candidate == null) return importIssue("kind", "Import canonical-data or a ready Form canonical candidate.")
  const parsedData = DataSnapshotV2Schema.safeParse(candidate.data)
  if (!parsedData.success || !record(candidate.collections)) {
    return importIssue("data", "Form JSON data or collections do not match the direct canonical contract.")
  }
  const parsedCollections: Record<string, VNextTableCollectionValueV1> = {}
  for (const [fieldKey, collectionValue] of Object.entries(candidate.collections)) {
    const parsed = VNextTableCollectionValueV1Schema.safeParse(collectionValue)
    if (!parsed.success || parsed.data.collectionFieldKey !== fieldKey) {
      return importIssue(`collections.${fieldKey}`, "A collection does not match the direct canonical contract.")
    }
    parsedCollections[fieldKey] = parsed.data
  }

  const next = createTestInputFormState(projection)
  const fields = new Map(projection.fields.map((field) => [field.key, field]))
  for (const [fieldKey, raw] of Object.entries(parsedData.data.values)) {
    const field = fields.get(fieldKey)
    if (field == null || field.valueType === "collection") {
      return importIssue(`data.values.${fieldKey}`, "The imported scalar field is not in this Form projection.")
    }
    const projected = importedValue(raw, field.valueType, assets)
    if (projected == null) {
      return importIssue(`data.values.${fieldKey}`, "The imported value does not match the projected field type.")
    }
    next.documentValues[fieldKey] = projected
  }
  for (const [fieldKey, collection] of Object.entries(parsedCollections)) {
    const field = fields.get(fieldKey)
    if (field?.valueType !== "collection" || field.collection == null) {
      return importIssue(`collections.${fieldKey}`, "The imported collection is not in this Form projection.")
    }
    const items = []
    for (let itemIndex = 0; itemIndex < collection.items.length; itemIndex += 1) {
      const item = collection.items[itemIndex]!
      const values: Record<string, TestInputEditableValue> = Object.fromEntries(
        field.collection.itemFields.map((itemField) => [
          itemField.key,
          itemField.valueType === "boolean"
            ? { valueType: "boolean" as const, value: null }
            : itemField.valueType === "image"
              ? { valueType: "image" as const, value: null }
              : { valueType: itemField.valueType, value: null },
        ]),
      )
      for (const [itemFieldKey, raw] of Object.entries(item.values)) {
        const itemField = field.collection.itemFields.find((candidateField) => candidateField.key === itemFieldKey)
        if (itemField == null) {
          return importIssue(
            `collections.${fieldKey}.items[${itemIndex}].values.${itemFieldKey}`,
            "The imported collection item field is not in this Form projection.",
          )
        }
        const projected = importedValue(raw, itemField.valueType, assets)
        if (projected == null) {
          return importIssue(
            `collections.${fieldKey}.items[${itemIndex}].values.${itemFieldKey}`,
            "The imported collection value does not match the projected field type.",
          )
        }
        values[itemFieldKey] = projected
      }
      items.push({ rowId: `imported-row-${itemIndex + 1}`, itemKey: item.itemKey, values })
    }
    next.collections[fieldKey] = { included: true, items }
  }
  return {
    status: "imported",
    state: { ...next, revision: current.revision + 1, dirty: true },
    issues: [],
  }
}
