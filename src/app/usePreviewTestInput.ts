import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { VNextPublishedStructureTestInputProjectionV1 } from "../core/coreAdapter"
import {
  REALDOC_E55_MAX_JSON_BYTES,
  applyTestInputJsonCommand,
  createTestInputJsonDiagnostics,
  createTestInputJsonState,
  reconcileTestInputJsonState,
  testInputMappingProfileKey,
  type TestInputJsonCommand,
  type TestInputJsonDiagnostics,
  type TestInputJsonIssue,
  type TestInputJsonState,
  type TestInputMappingProfileOption,
} from "../editor/preview/testInputJsonState"
import {
  usePreviewTestInputForm,
  type PreviewTestInputFormInteraction,
} from "./usePreviewTestInputForm"

export type PreviewTestInputMode = "form" | "json"

export interface PreviewTestInputJsonInteraction {
  state: TestInputJsonState | null
  diagnostics: TestInputJsonDiagnostics | null
  lastIssue: TestInputJsonIssue | null
  mappingProfiles: readonly TestInputMappingProfileOption[]
  clearPayload: () => void
  reset: () => void
  selectFile: (file: File | null) => Promise<void>
  selectMappingProfile: (selectionKey: string | null) => void
  setPayloadText: (payloadText: string) => void
}

export interface PreviewTestInputInteraction {
  mode: PreviewTestInputMode
  form: PreviewTestInputFormInteraction
  json: PreviewTestInputJsonInteraction
  resetActive: () => void
  setMode: (mode: PreviewTestInputMode) => void
}

function mappingCatalogIdentity(options: readonly TestInputMappingProfileOption[]): string {
  return JSON.stringify(options.map(({ profile }) => [
    profile.mappingProfileId,
    profile.mappingProfileVersion,
    profile.profileFingerprint,
    profile.owner.structureId,
    profile.owner.structureVersionId,
    profile.owner.versionOrdinal,
    profile.target.dataContractId,
    profile.target.dataContractFingerprint,
  ]))
}

function validJsonFile(file: File): boolean {
  const mediaType = file.type.toLowerCase()
  return file.name.trim().toLowerCase().endsWith(".json")
    && (mediaType === "" || mediaType === "application/json" || mediaType === "text/json")
    && Number.isSafeInteger(file.size)
    && file.size > 0
    && file.size <= REALDOC_E55_MAX_JSON_BYTES
}

export function usePreviewTestInput(
  projection: VNextPublishedStructureTestInputProjectionV1 | null,
  mappingProfiles: readonly TestInputMappingProfileOption[] = [],
): PreviewTestInputInteraction {
  const form = usePreviewTestInputForm(projection)
  const [mode, setMode] = useState<PreviewTestInputMode>("form")
  const [state, setState] = useState<TestInputJsonState | null>(() => (
    projection == null ? null : createTestInputJsonState(projection)
  ))
  const [lastIssue, setLastIssue] = useState<TestInputJsonIssue | null>(null)
  const stateRef = useRef(state)
  const fileReadOrdinalRef = useRef(0)
  const projectionIdentity = projection == null ? null : JSON.stringify([
    projection.owner.structureId,
    projection.owner.structureVersionId,
    projection.owner.versionOrdinal,
    projection.structureFingerprint,
    projection.dataContract.dataContractFingerprint,
    projection.projectionFingerprint,
  ])
  const catalogIdentity = mappingCatalogIdentity(mappingProfiles)

  useEffect(() => {
    fileReadOrdinalRef.current += 1
    setLastIssue(null)
    setState((current) => {
      const next = projection == null
        ? null
        : current == null
          ? createTestInputJsonState(projection)
          : reconcileTestInputJsonState(current, projection, mappingProfiles)
      stateRef.current = next
      return next
    })
  }, [catalogIdentity, projectionIdentity])

  const dispatch = useCallback((command: TestInputJsonCommand) => {
    const current = stateRef.current
    if (current == null || projection == null) return false
    const result = applyTestInputJsonCommand(current, projection, mappingProfiles, command)
    setLastIssue(result.issue)
    if (result.status === "blocked") return false
    stateRef.current = result.state
    setState(result.state)
    return true
  }, [catalogIdentity, projection])

  const setPayloadText = useCallback((payloadText: string) => {
    fileReadOrdinalRef.current += 1
    dispatch({ kind: "json.text.set", payloadText })
  }, [dispatch])

  const clearPayload = useCallback(() => {
    fileReadOrdinalRef.current += 1
    dispatch({ kind: "json.payload.clear" })
  }, [dispatch])

  const selectFile = useCallback(async (file: File | null) => {
    const readOrdinal = fileReadOrdinalRef.current + 1
    fileReadOrdinalRef.current = readOrdinal
    if (file == null) {
      dispatch({ kind: "json.payload.clear" })
      return
    }
    if (!validJsonFile(file)) {
      setLastIssue({
        severity: "error",
        code: file.size > REALDOC_E55_MAX_JSON_BYTES ? "json-payload-too-large" : "json-file-invalid",
        path: "payloadFile",
        message: file.size > REALDOC_E55_MAX_JSON_BYTES
          ? `JSON input must not exceed ${REALDOC_E55_MAX_JSON_BYTES} UTF-8 bytes.`
          : "Select a non-empty JSON file within the local size limit.",
      })
      return
    }

    let payloadText: string
    try {
      payloadText = await file.text()
    } catch {
      if (fileReadOrdinalRef.current !== readOrdinal) return
      setLastIssue({
        severity: "error",
        code: "json-file-invalid",
        path: "payloadFile",
        message: "The selected JSON file could not be read.",
      })
      return
    }
    if (fileReadOrdinalRef.current !== readOrdinal) return
    dispatch({
      kind: "json.file.set",
      payloadText,
      file: {
        fileName: file.name,
        mediaType: file.type,
        byteLength: file.size,
        lastModified: file.lastModified,
      },
    })
  }, [dispatch])

  const selectMappingProfile = useCallback((selectionKey: string | null) => {
    const option = selectionKey == null
      ? null
      : mappingProfiles.find(({ profile }) => testInputMappingProfileKey({
          mappingProfileId: profile.mappingProfileId,
          mappingProfileVersion: profile.mappingProfileVersion,
          profileFingerprint: profile.profileFingerprint,
        }) === selectionKey) ?? null
    if (selectionKey != null && option == null) {
      setLastIssue({
        severity: "error",
        code: "mapping-profile-unavailable",
        path: "mappingProfile",
        message: "The exact mapping profile is not available.",
      })
      return
    }
    dispatch({
      kind: "mapping-profile.select",
      selection: option == null ? null : {
        mappingProfileId: option.profile.mappingProfileId,
        mappingProfileVersion: option.profile.mappingProfileVersion,
        profileFingerprint: option.profile.profileFingerprint,
      },
    })
  }, [catalogIdentity, dispatch])

  const resetJson = useCallback(() => {
    fileReadOrdinalRef.current += 1
    dispatch({ kind: "json.reset" })
  }, [dispatch])

  const diagnostics = useMemo(() => (
    state == null || projection == null
      ? null
      : createTestInputJsonDiagnostics(state, projection, mappingProfiles)
  ), [catalogIdentity, projection, state])

  const resetActive = useCallback(() => {
    if (mode === "form") form.reset()
    else resetJson()
  }, [form.reset, mode, resetJson])

  return {
    mode,
    form,
    json: {
      state,
      diagnostics,
      lastIssue,
      mappingProfiles,
      clearPayload,
      reset: resetJson,
      selectFile,
      selectMappingProfile,
      setPayloadText,
    },
    resetActive,
    setMode,
  }
}
