import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type {
  ImageAssetRegistryV1,
  VNextPublishedStructureTestInputProjectionV1,
} from "../core/coreAdapter"
import {
  importTestInputFormCanonicalCandidate,
  parseTestInputFormCanonicalJson,
  projectTestInputFormCanonicalCandidate,
  type TestInputFormCanonicalCandidate,
} from "../editor/preview/testInputFormCanonicalCandidate"
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
  candidate: TestInputFormCanonicalCandidate | null
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
  importCanonicalFile: (file: File | null) => Promise<void>
  importCanonicalText: (text: string) => boolean
}

export const REALDOC_E59_MAX_FORM_JSON_BYTES = 2 * 1024 * 1024

type ImageSelectionResult =
  | { selection: TestInputImageSelection; issue: null }
  | { selection: null; issue: TestInputFormIssue }

async function createSelection(file: File, assets: ImageAssetRegistryV1): Promise<ImageSelectionResult> {
  if (file.type !== "image/png" && file.type !== "image/jpeg") return {
    selection: null,
    issue: { code: "image-selection-invalid", path: "image", message: "Select a PNG or JPEG image." },
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > REALDOC_E54_MAX_IMAGE_BYTES) return {
    selection: null,
    issue: { code: "image-selection-invalid", path: "image", message: "Select an image within the local size limit." },
  }
  const digestBytes = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer()))
  const sha256 = Array.from(digestBytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  const trusted = Object.values(assets.images).find((asset) => (
    asset.mediaType === file.type
    && asset.byteLength === file.size
    && asset.digest.value === sha256
  ))
  if (trusted == null) return {
    selection: null,
    issue: {
      code: "image-asset-not-trusted",
      path: "image",
      message: "This local Preview can use only an image already admitted by the Backend.",
    },
  }

  return {
    selection: {
      selectionId: globalThis.crypto.randomUUID(),
      fileName: file.name,
      mediaType: file.type,
      byteLength: file.size,
      lastModified: file.lastModified,
      trustedAssetId: trusted.id,
      sha256,
    },
    issue: null,
  }
}

export function usePreviewTestInputForm(
  projection: VNextPublishedStructureTestInputProjectionV1 | null,
  assets: ImageAssetRegistryV1 = { version: 1, images: {} },
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
  const imageRequestRef = useRef(new Map<string, string>())
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
    const path = `documentValues.${fieldKey}`
    const requestId = globalThis.crypto.randomUUID()
    imageRequestRef.current.set(path, requestId)
    if (file == null) {
      const previous = stateRef.current?.documentValues[fieldKey]
      const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
      if (!dispatch({ kind: "document-image.set", fieldKey, selection: null })) return
      if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
      return
    }
    void createSelection(file, assets).then((result) => {
      if (imageRequestRef.current.get(path) !== requestId) return
      if (result.issue != null) {
        setLastIssue({ ...result.issue, path })
        return
      }
      const previous = stateRef.current?.documentValues[fieldKey]
      const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
      if (!dispatch({ kind: "document-image.set", fieldKey, selection: result.selection })) return
      if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
      fileRegistryRef.current.set(result.selection.selectionId, file)
    }).catch(() => setLastIssue({
      code: "image-selection-invalid",
      path,
      message: "The image could not be inspected.",
    }))
  }, [assets, dispatch])

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
    const path = `collections.${fieldKey}.items.${rowId}.values.${itemFieldKey}`
    const requestId = globalThis.crypto.randomUUID()
    imageRequestRef.current.set(path, requestId)
    if (file == null) {
      const item = stateRef.current?.collections[fieldKey]?.items.find((candidate) => candidate.rowId === rowId)
      const previous = item?.values[itemFieldKey]
      const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
      if (!dispatch({ kind: "collection-item-image.set", fieldKey, rowId, itemFieldKey, selection: null })) return
      if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
      return
    }
    void createSelection(file, assets).then((result) => {
      if (imageRequestRef.current.get(path) !== requestId) return
      if (result.issue != null) {
        setLastIssue({ ...result.issue, path })
        return
      }
      const item = stateRef.current?.collections[fieldKey]?.items.find((candidate) => candidate.rowId === rowId)
      const previous = item?.values[itemFieldKey]
      const previousSelectionId = previous?.valueType === "image" ? previous.value?.selectionId : null
      if (!dispatch({
        kind: "collection-item-image.set",
        fieldKey,
        rowId,
        itemFieldKey,
        selection: result.selection,
      })) return
      if (previousSelectionId) fileRegistryRef.current.delete(previousSelectionId)
      fileRegistryRef.current.set(result.selection.selectionId, file)
    }).catch(() => setLastIssue({
      code: "image-selection-invalid",
      path,
      message: "The image could not be inspected.",
    }))
  }, [assets, dispatch])

  const reset = useCallback(() => {
    if (!dispatch({ kind: "form.reset" })) return
    fileRegistryRef.current.clear()
  }, [dispatch])

  const getSelectedFile = useCallback((selectionId: string) => (
    fileRegistryRef.current.get(selectionId) ?? null
  ), [])

  const importCanonicalText = useCallback((text: string): boolean => {
    const current = stateRef.current
    if (current == null || projection == null) return false
    const byteLength = new TextEncoder().encode(text).byteLength
    if (byteLength <= 0 || byteLength > REALDOC_E59_MAX_FORM_JSON_BYTES) {
      setLastIssue({
        code: "form-import-too-large",
        path: "formImport",
        message: "Form JSON must be within 2 MiB.",
      })
      return false
    }
    let value: unknown
    try {
      value = parseTestInputFormCanonicalJson(text)
    } catch {
      setLastIssue({ code: "form-import-invalid", path: "formImport", message: "Form JSON is not valid JSON." })
      return false
    }
    const result = importTestInputFormCanonicalCandidate(current, projection, assets, value)
    if (result.status === "blocked") {
      setLastIssue({
        code: "form-import-invalid",
        path: result.issues[0]?.path ?? "formImport",
        message: result.issues[0]?.message ?? "Form JSON does not match this projection.",
      })
      return false
    }
    fileRegistryRef.current.clear()
    stateRef.current = result.state
    setState(result.state)
    setLastIssue(null)
    return true
  }, [assets, projection])

  const importCanonicalFile = useCallback(async (file: File | null) => {
    if (file == null) return
    if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > REALDOC_E59_MAX_FORM_JSON_BYTES) {
      setLastIssue({
        code: "form-import-too-large",
        path: "formImport",
        message: "Choose a Form JSON file within 2 MiB.",
      })
      return
    }
    importCanonicalText(await file.text())
  }, [importCanonicalText])

  const candidate = useMemo(() => (
    state == null || projection == null
      ? null
      : projectTestInputFormCanonicalCandidate(state, projection, assets)
  ), [assets, projection, state])

  return {
    state,
    candidate,
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
    importCanonicalFile,
    importCanonicalText,
  }
}
