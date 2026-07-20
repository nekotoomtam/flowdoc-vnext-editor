import type {
  VNextPublishedStructureMappingProfileV1,
  VNextPublishedStructureTestInputProjectionV1,
} from "../../core/coreAdapter"
import {
  createTestInputProjectionPins,
  testInputProjectionPinsMatch,
  type TestInputProjectionPins,
} from "./testInputFormState"

export const REALDOC_E55_MAX_JSON_BYTES = 1024 * 1024
export const REALDOC_E58_LARGE_JSON_EDITOR_BYTES = 256 * 1024

export function usesDeferredLargeJsonEditor(byteLength: number): boolean {
  return byteLength >= REALDOC_E58_LARGE_JSON_EDITOR_BYTES
}

export interface TestInputMappingProfileOption {
  label: string
  profile: VNextPublishedStructureMappingProfileV1
}

export interface TestInputMappingProfileSelection {
  mappingProfileId: string
  mappingProfileVersion: number
  profileFingerprint: string
}

export interface TestInputJsonFileDescriptor {
  fileName: string
  mediaType: string
  byteLength: number
  lastModified: number
}

export interface TestInputJsonState {
  contractVersion: 1
  kind: "editor-test-input-json-state"
  status: "ready"
  storage: "memory-only"
  projectionPins: TestInputProjectionPins
  revision: number
  dirty: boolean
  payloadText: string
  payloadSource: { kind: "typed" } | { kind: "file"; file: TestInputJsonFileDescriptor }
  mappingProfile: TestInputMappingProfileSelection | null
  execution: {
    syntaxCheck: "not-run" | "run-valid" | "run-invalid"
    mapping: "not-run"
    snapshotCreation: "not-run"
    validation: "not-run"
    materialization: "not-run"
    artifact: "not-run"
  }
}

export type TestInputJsonIssueCode =
  | "json-payload-required"
  | "json-payload-too-large"
  | "json-file-invalid"
  | "json-syntax-invalid"
  | "mapping-profile-required"
  | "mapping-profile-unavailable"
  | "mapping-profile-owner-mismatch"
  | "mapping-profile-target-mismatch"
  | "projection-stale"

export interface TestInputJsonIssue {
  severity: "info" | "error"
  code: TestInputJsonIssueCode
  path: string
  message: string
}

export interface TestInputJsonDiagnostics {
  contentFree: true
  status: "incomplete" | "blocked" | "ready-for-admission"
  issues: TestInputJsonIssue[]
  summary: {
    errorCount: number
    infoCount: number
    payloadByteLength: number
    mappingProfileSelected: boolean
  }
}

export type TestInputJsonCommand =
  | { kind: "json.text.set"; payloadText: string }
  | { kind: "json.file.set"; payloadText: string; file: TestInputJsonFileDescriptor }
  | { kind: "json.payload.clear" }
  | { kind: "mapping-profile.select"; selection: TestInputMappingProfileSelection | null }
  | { kind: "json.reset" }

export type TestInputJsonCommandResult =
  | { status: "applied"; state: TestInputJsonState; issue: null }
  | { status: "blocked"; state: TestInputJsonState; issue: TestInputJsonIssue }

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function selectionFromProfile(
  profile: VNextPublishedStructureMappingProfileV1,
): TestInputMappingProfileSelection {
  return {
    mappingProfileId: profile.mappingProfileId,
    mappingProfileVersion: profile.mappingProfileVersion,
    profileFingerprint: profile.profileFingerprint,
  }
}

export function testInputMappingProfileKey(selection: TestInputMappingProfileSelection): string {
  return JSON.stringify([
    selection.mappingProfileId,
    selection.mappingProfileVersion,
    selection.profileFingerprint,
  ])
}

export function testInputMappingProfileOptionKey(option: TestInputMappingProfileOption): string {
  return testInputMappingProfileKey(selectionFromProfile(option.profile))
}

function exactProfile(
  selection: TestInputMappingProfileSelection,
  options: readonly TestInputMappingProfileOption[],
): TestInputMappingProfileOption | null {
  const key = testInputMappingProfileKey(selection)
  return options.find((option) => testInputMappingProfileOptionKey(option) === key) ?? null
}

export function testInputMappingProfileMatchesProjection(
  option: TestInputMappingProfileOption,
  projection: VNextPublishedStructureTestInputProjectionV1,
): boolean {
  const { profile } = option
  return profile.owner.structureId === projection.owner.structureId
    && profile.owner.structureVersionId === projection.owner.structureVersionId
    && profile.owner.versionOrdinal === projection.owner.versionOrdinal
    && profile.target.dataContractId === projection.dataContract.dataContractId
    && profile.target.dataContractFingerprint === projection.dataContract.dataContractFingerprint
}

function execution(payloadText: string): TestInputJsonState["execution"] {
  let syntaxCheck: TestInputJsonState["execution"]["syntaxCheck"] = "not-run"
  if (payloadText.trim().length > 0) {
    try {
      JSON.parse(payloadText)
      syntaxCheck = "run-valid"
    } catch {
      syntaxCheck = "run-invalid"
    }
  }
  return {
    syntaxCheck,
    mapping: "not-run",
    snapshotCreation: "not-run",
    validation: "not-run",
    materialization: "not-run",
    artifact: "not-run",
  }
}

export function createTestInputJsonState(
  projection: VNextPublishedStructureTestInputProjectionV1,
): TestInputJsonState {
  return {
    contractVersion: 1,
    kind: "editor-test-input-json-state",
    status: "ready",
    storage: "memory-only",
    projectionPins: createTestInputProjectionPins(projection),
    revision: 0,
    dirty: false,
    payloadText: "",
    payloadSource: { kind: "typed" },
    mappingProfile: null,
    execution: execution(""),
  }
}

export function reconcileTestInputJsonState(
  state: TestInputJsonState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  options: readonly TestInputMappingProfileOption[],
): TestInputJsonState {
  if (!testInputProjectionPinsMatch(state.projectionPins, projection)) {
    return createTestInputJsonState(projection)
  }
  if (state.mappingProfile == null || exactProfile(state.mappingProfile, options) != null) return state
  return {
    ...state,
    revision: state.revision + 1,
    dirty: state.payloadText.length > 0,
    mappingProfile: null,
  }
}

function issue(
  state: TestInputJsonState,
  code: TestInputJsonIssueCode,
  path: string,
  message: string,
): TestInputJsonCommandResult {
  return { status: "blocked", state, issue: { severity: "error", code, path, message } }
}

function applied(state: TestInputJsonState): TestInputJsonCommandResult {
  return {
    status: "applied",
    state: { ...state, revision: state.revision + 1, dirty: true },
    issue: null,
  }
}

function validFile(file: TestInputJsonFileDescriptor): boolean {
  const mediaType = file.mediaType.toLowerCase()
  return file.fileName.trim().toLowerCase().endsWith(".json")
    && (mediaType === "" || mediaType === "application/json" || mediaType === "text/json")
    && Number.isSafeInteger(file.byteLength)
    && file.byteLength > 0
    && file.byteLength <= REALDOC_E55_MAX_JSON_BYTES
    && Number.isSafeInteger(file.lastModified)
    && file.lastModified >= 0
}

export function applyTestInputJsonCommand(
  state: TestInputJsonState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  options: readonly TestInputMappingProfileOption[],
  command: TestInputJsonCommand,
): TestInputJsonCommandResult {
  if (!testInputProjectionPinsMatch(state.projectionPins, projection)) {
    return issue(state, "projection-stale", "projectionPins", "The test input projection changed.")
  }

  if (command.kind === "json.reset") {
    return {
      status: "applied",
      state: { ...createTestInputJsonState(projection), revision: state.revision + 1 },
      issue: null,
    }
  }

  if (command.kind === "json.payload.clear") {
    return applied({
      ...state,
      payloadText: "",
      payloadSource: { kind: "typed" },
      execution: execution(""),
    })
  }

  if (command.kind === "mapping-profile.select") {
    if (command.selection == null) return applied({ ...state, mappingProfile: null })
    const option = exactProfile(command.selection, options)
    if (option == null) {
      return issue(
        state,
        "mapping-profile-unavailable",
        "mappingProfile",
        "The exact mapping profile is not available.",
      )
    }
    const owner = option.profile.owner
    if (
      owner.structureId !== projection.owner.structureId
      || owner.structureVersionId !== projection.owner.structureVersionId
      || owner.versionOrdinal !== projection.owner.versionOrdinal
    ) {
      return issue(
        state,
        "mapping-profile-owner-mismatch",
        "mappingProfile.owner",
        "The mapping profile owner does not match this Published Structure Version.",
      )
    }
    if (!testInputMappingProfileMatchesProjection(option, projection)) {
      return issue(
        state,
        "mapping-profile-target-mismatch",
        "mappingProfile.target",
        "The mapping profile does not target this generation data contract.",
      )
    }
    return applied({ ...state, mappingProfile: selectionFromProfile(option.profile) })
  }

  if (utf8ByteLength(command.payloadText) > REALDOC_E55_MAX_JSON_BYTES) {
    return issue(
      state,
      "json-payload-too-large",
      "payloadText",
      `JSON input must not exceed ${REALDOC_E55_MAX_JSON_BYTES} UTF-8 bytes.`,
    )
  }

  if (command.kind === "json.file.set" && !validFile(command.file)) {
    return issue(
      state,
      "json-file-invalid",
      "payloadFile",
      "Select a non-empty JSON file within the local size limit.",
    )
  }

  return applied({
    ...state,
    payloadText: command.payloadText,
    payloadSource: command.kind === "json.file.set" ? { kind: "file", file: command.file } : { kind: "typed" },
    execution: execution(command.payloadText),
  })
}

export function createTestInputJsonDiagnostics(
  state: TestInputJsonState,
  projection: VNextPublishedStructureTestInputProjectionV1,
  options: readonly TestInputMappingProfileOption[],
): TestInputJsonDiagnostics {
  const issues: TestInputJsonIssue[] = []
  const payloadByteLength = utf8ByteLength(state.payloadText)
  const add = (
    severity: TestInputJsonIssue["severity"],
    code: TestInputJsonIssueCode,
    path: string,
    message: string,
  ) => { issues.push({ severity, code, path, message }) }

  if (state.payloadText.trim().length === 0) {
    add("info", "json-payload-required", "payloadText", "JSON input has not been provided.")
  } else if (payloadByteLength > REALDOC_E55_MAX_JSON_BYTES) {
    add("error", "json-payload-too-large", "payloadText", "JSON input exceeds the local UTF-8 size limit.")
  } else if (state.execution.syntaxCheck === "run-invalid") {
    add("error", "json-syntax-invalid", "payloadText", "JSON syntax could not be parsed.")
  }

  if (state.mappingProfile == null) {
    add("info", "mapping-profile-required", "mappingProfile", "A mapping profile has not been selected.")
  } else {
    const option = exactProfile(state.mappingProfile, options)
    if (option == null) {
      add("error", "mapping-profile-unavailable", "mappingProfile", "The exact mapping profile is unavailable.")
    } else {
      const owner = option.profile.owner
      if (
        owner.structureId !== projection.owner.structureId
        || owner.structureVersionId !== projection.owner.structureVersionId
        || owner.versionOrdinal !== projection.owner.versionOrdinal
      ) add(
        "error",
        "mapping-profile-owner-mismatch",
        "mappingProfile.owner",
        "The mapping profile owner does not match this Published Structure Version.",
      )
      if (
        option.profile.target.dataContractId !== projection.dataContract.dataContractId
        || option.profile.target.dataContractFingerprint !== projection.dataContract.dataContractFingerprint
      ) add(
        "error",
        "mapping-profile-target-mismatch",
        "mappingProfile.target",
        "The mapping profile target does not match this generation data contract.",
      )
    }
  }

  const errorCount = issues.filter((item) => item.severity === "error").length
  const infoCount = issues.length - errorCount
  return {
    contentFree: true,
    status: errorCount > 0 ? "blocked" : infoCount > 0 ? "incomplete" : "ready-for-admission",
    issues,
    summary: {
      errorCount,
      infoCount,
      payloadByteLength,
      mappingProfileSelected: state.mappingProfile != null,
    },
  }
}
