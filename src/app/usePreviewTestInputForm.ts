import { useCallback, useEffect, useRef, useState } from "react"
import type { VNextPublishedStructureTestInputProjectionV1 } from "../core/coreAdapter"
import {
  REALDOC_E54_MAX_IMAGE_BYTES,
  applyTestInputFormCommand,
  createTestInputFormState,
  reconcileTestInputFormState,
  type TestInputFormCommand,
  type TestInputFormIssue,
  type TestInputFormState,
  type TestInputImageSelection,
  type TestInputScalarValue,
} from "../editor/preview/testInputFormState"

export interface PreviewTestInputFormInteraction {
  state: TestInputFormState | null
  lastIssue: TestInputFormIssue | null
  addCollectionItem: (fieldKey: string) => void
  removeCollectionItem: (fieldKey: string, rowId: string) => void
  reset: () => void
  setCollectionIncluded: (fieldKey: string, included: boolean) => void
  setCollectionItemImage: (fieldKey: string, rowId: string, itemFieldKey: string, file: File | null) => void
  setCollectionItemKey: (fieldKey: string, rowId: string, itemKey: string) => void
  setCollectionItemValue: (
    fieldKey: string,
    rowId: string,
    itemFieldKey: string,
    value: TestInputScalarValue,
  ) => void
  setDocumentImage: (fieldKey: string, file: File | null) => void
  setDocumentValue: (fieldKey: string, value: TestInputScalarValue) => void
  getSelectedFile: (selectionId: string) => File | null
}

function createSelection(file: File): TestInputImageSelection | null {
  if (file.type !== "image/png" && file.type !== "image/jpeg") return null
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > REALDOC_E54_MAX_IMAGE_BYTES) return null

  return {
    selectionId: globalThis.crypto.randomUUID(),
    fileName: file.name,
    mediaType: file.type,
    byteLength: file.size,
    lastModified: file.lastModified,
  }
}

export function usePreviewTestInputForm(
  projection: VNextPublishedStructureTestInputProjectionV1 | null,
): PreviewTestInputFormInteraction {
  const projectionIdentity = projection == null ? null : JSON.stringify([
    projection.owner.structureId,
    projection.owner.structureVersionId,
    projection.owner.versionOrdinal,
    projection.structureFingerprint,
    projection.dataContract.dataContractFingerprint,
    projection.projectionFingerprint,
  ])
  const [state, setState] = useState<TestInputFormState | null>(() => (
    projection == null ? null : createTestInputFormState(projection)
  ))
  const [lastIssue, setLastIssue] = useState<TestInputFormIssue | null>(null)
  const stateRef = useRef(state)
  const fileRegistryRef = useRef(new Map<string, File>())
  const nextRowOrdinalRef = useRef(1)

  useEffect(() => {
    fileRegistryRef.current.clear()
    setLastIssue(null)
    setState((current) => {
      const next = projection == null
        ? null
        : current == null
          ? createTestInputFormState(projection)
          : reconcileTestInputFormState(current, projection)
      stateRef.current = next
      return next
    })
  }, [projectionIdentity])

  const dispatch = useCallback((command: TestInputFormCommand) => {
    const current = stateRef.current
    if (current == null || projection == null) return false
    const result = applyTestInputFormCommand(current, projection, command)
    setLastIssue(result.issue)
    if (result.status === "blocked") return false
    stateRef.current = result.state
    setState(result.state)
    return true
  }, [projection])

  const setDocumentValue = useCallback((fieldKey: string, value: TestInputScalarValue) => {
    dispatch({ kind: "document-value.set", fieldKey, value })
  }, [dispatch])

  const setDocumentImage = useCallback((fieldKey: string, file: File | null) => {
    const previous = stateRef.current?.documentValues[fieldKey]
    const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
    const selection = file == null ? null : createSelection(file)
    if (file != null && selection == null) {
      setLastIssue({
        code: "image-selection-invalid",
        path: `documentValues.${fieldKey}`,
        message: "Select a PNG or JPEG image within the local size limit.",
      })
      return
    }
    if (!dispatch({ kind: "document-image.set", fieldKey, selection })) return
    if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
    if (file && selection) fileRegistryRef.current.set(selection.selectionId, file)
  }, [dispatch])

  const setCollectionIncluded = useCallback((fieldKey: string, included: boolean) => {
    dispatch({ kind: "collection.inclusion.set", fieldKey, included })
  }, [dispatch])

  const addCollectionItem = useCallback((fieldKey: string) => {
    const rowId = `local-row-${nextRowOrdinalRef.current}`
    nextRowOrdinalRef.current += 1
    dispatch({ kind: "collection-item.add", fieldKey, rowId })
  }, [dispatch])

  const removeCollectionItem = useCallback((fieldKey: string, rowId: string) => {
    const item = stateRef.current?.collections[fieldKey]?.items.find((candidate) => candidate.rowId === rowId)
    if (!dispatch({ kind: "collection-item.remove", fieldKey, rowId })) return
    for (const value of Object.values(item?.values ?? {})) {
      if (value.valueType === "image" && value.value) fileRegistryRef.current.delete(value.value.selectionId)
    }
  }, [dispatch])

  const setCollectionItemKey = useCallback((fieldKey: string, rowId: string, itemKey: string) => {
    dispatch({ kind: "collection-item-key.set", fieldKey, rowId, itemKey })
  }, [dispatch])

  const setCollectionItemValue = useCallback((
    fieldKey: string,
    rowId: string,
    itemFieldKey: string,
    value: TestInputScalarValue,
  ) => {
    dispatch({ kind: "collection-item-value.set", fieldKey, rowId, itemFieldKey, value })
  }, [dispatch])

  const setCollectionItemImage = useCallback((
    fieldKey: string,
    rowId: string,
    itemFieldKey: string,
    file: File | null,
  ) => {
    const item = stateRef.current?.collections[fieldKey]?.items.find((candidate) => candidate.rowId === rowId)
    const previous = item?.values[itemFieldKey]
    const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
    const selection = file == null ? null : createSelection(file)
    if (file != null && selection == null) {
      setLastIssue({
        code: "image-selection-invalid",
        path: `collections.${fieldKey}.values.${itemFieldKey}`,
        message: "Select a PNG or JPEG image within the local size limit.",
      })
      return
    }
    if (!dispatch({ kind: "collection-item-image.set", fieldKey, rowId, itemFieldKey, selection })) return
    if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
    if (file && selection) fileRegistryRef.current.set(selection.selectionId, file)
  }, [dispatch])

  const reset = useCallback(() => {
    if (!dispatch({ kind: "form.reset" })) return
    fileRegistryRef.current.clear()
  }, [dispatch])

  const getSelectedFile = useCallback((selectionId: string) => (
    fileRegistryRef.current.get(selectionId) ?? null
  ), [])

  return {
    state,
    lastIssue,
    addCollectionItem,
    removeCollectionItem,
    reset,
    setCollectionIncluded,
    setCollectionItemImage,
    setCollectionItemKey,
    setCollectionItemValue,
    setDocumentImage,
    setDocumentValue,
    getSelectedFile,
  }
}
