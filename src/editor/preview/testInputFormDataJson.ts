import type { TestInputEditableValue, TestInputFormState } from "./testInputFormState"

function value(input: TestInputEditableValue): unknown {
  if (input.valueType !== "image") return input.value
  if (input.value == null) return null
  return {
    fileName: input.value.fileName,
    mediaType: input.value.mediaType,
    byteLength: input.value.byteLength,
  }
}

export function projectTestInputFormDataJsonDraft(state: TestInputFormState): Record<string, unknown> {
  return {
    contractVersion: 1,
    kind: "editor-form-data-json-draft",
    status: "draft-not-validated",
    fields: Object.fromEntries(Object.entries(state.documentValues).map(([fieldKey, fieldValue]) => (
      [fieldKey, value(fieldValue)]
    ))),
    collections: Object.fromEntries(Object.entries(state.collections).map(([fieldKey, collection]) => [
      fieldKey,
      collection.included
        ? collection.items.map((item) => ({
            itemKey: item.itemKey,
            fields: Object.fromEntries(Object.entries(item.values).map(([itemFieldKey, itemValue]) => (
              [itemFieldKey, value(itemValue)]
            ))),
          }))
        : null,
    ])),
  }
}

export function stringifyTestInputFormDataJsonDraft(state: TestInputFormState): string {
  return JSON.stringify(projectTestInputFormDataJsonDraft(state), null, 2)
}
