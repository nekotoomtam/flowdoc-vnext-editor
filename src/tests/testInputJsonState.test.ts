import { describe, expect, it } from "vitest"
import {
  REALDOC_E55_MAX_JSON_BYTES,
  REALDOC_E58_LARGE_JSON_EDITOR_BYTES,
  applyTestInputJsonCommand,
  createTestInputJsonDiagnostics,
  createTestInputJsonState,
  reconcileTestInputJsonState,
  testInputMappingProfileOptionKey,
  usesDeferredLargeJsonEditor,
  type TestInputJsonCommand,
  type TestInputJsonState,
} from "../editor/preview/testInputJsonState"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"
import { REALDOC_E55_MAPPING_PROFILES_FIXTURE } from "../fixtures/realdocE55MappingProfilesFixture"

function apply(state: TestInputJsonState, command: TestInputJsonCommand): TestInputJsonState {
  const result = applyTestInputJsonCommand(
    state,
    REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    command,
  )
  expect(result.status).toBe("applied")
  return result.state
}

describe("PDF-EXPORT-REALDOC-E.5.5 temporary JSON state", () => {
  it("defers editing once a JSON payload reaches the E.5.8 large-input threshold", () => {
    expect(usesDeferredLargeJsonEditor(REALDOC_E58_LARGE_JSON_EDITOR_BYTES - 1)).toBe(false)
    expect(usesDeferredLargeJsonEditor(REALDOC_E58_LARGE_JSON_EDITOR_BYTES)).toBe(true)
  })

  it("starts memory-only with content-free incomplete diagnostics and no execution", () => {
    const state = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const diagnostics = createTestInputJsonDiagnostics(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    )

    expect(state.storage).toBe("memory-only")
    expect(state.payloadText).toBe("")
    expect(state.mappingProfile).toBeNull()
    expect(state.execution).toEqual({
      syntaxCheck: "not-run",
      mapping: "not-run",
      snapshotCreation: "not-run",
      validation: "not-run",
      materialization: "not-run",
      artifact: "not-run",
    })
    expect(diagnostics).toMatchObject({
      contentFree: true,
      status: "incomplete",
      summary: { errorCount: 0, infoCount: 2, payloadByteLength: 0, mappingProfileSelected: false },
    })
  })

  it("accepts valid UTF-8 JSON plus one exact compatible profile without running mapping", () => {
    let state = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "json.text.set", payloadText: '{"records":[{"title":"Example"}]}' })
    const option = REALDOC_E55_MAPPING_PROFILES_FIXTURE[0]!
    state = apply(state, {
      kind: "mapping-profile.select",
      selection: {
        mappingProfileId: option.profile.mappingProfileId,
        mappingProfileVersion: option.profile.mappingProfileVersion,
        profileFingerprint: option.profile.profileFingerprint,
      },
    })
    const diagnostics = createTestInputJsonDiagnostics(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    )

    expect(testInputMappingProfileOptionKey(option)).toContain(option.profile.mappingProfileId)
    expect(state.execution).toMatchObject({ syntaxCheck: "run-valid", mapping: "not-run" })
    expect(diagnostics).toMatchObject({ contentFree: true, status: "ready-for-admission", issues: [] })
  })

  it("reports invalid JSON without copying payload values or parser exception text", () => {
    const sensitiveValue = "private-patient-value"
    const state = apply(createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE), {
      kind: "json.text.set",
      payloadText: `{"record":"${sensitiveValue}"`,
    })
    const diagnostics = createTestInputJsonDiagnostics(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    )
    const serialized = JSON.stringify(diagnostics)

    expect(diagnostics.status).toBe("blocked")
    expect(diagnostics.issues).toContainEqual(expect.objectContaining({ code: "json-syntax-invalid" }))
    expect(serialized).not.toContain(sensitiveValue)
    expect(serialized).not.toContain("Unexpected")
  })

  it("measures the exact UTF-8 text length instead of JavaScript character count", () => {
    const payloadText = '{"title":"ไทย"}'
    const state = apply(createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE), {
      kind: "json.text.set",
      payloadText,
    })
    const diagnostics = createTestInputJsonDiagnostics(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    )

    expect(diagnostics.summary.payloadByteLength).toBe(new TextEncoder().encode(payloadText).byteLength)
    expect(diagnostics.summary.payloadByteLength).toBeGreaterThan(payloadText.length)
  })

  it("blocks oversized text and invalid file descriptors without retaining them", () => {
    const initial = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const oversized = applyTestInputJsonCommand(
      initial,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
      { kind: "json.text.set", payloadText: "x".repeat(REALDOC_E55_MAX_JSON_BYTES + 1) },
    )
    const invalidFile = applyTestInputJsonCommand(
      initial,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
      {
        kind: "json.file.set",
        payloadText: "{}",
        file: { fileName: "payload.txt", mediaType: "text/plain", byteLength: 2, lastModified: 1 },
      },
    )

    expect(oversized).toMatchObject({ status: "blocked", issue: { code: "json-payload-too-large" } })
    expect(invalidFile).toMatchObject({ status: "blocked", issue: { code: "json-file-invalid" } })
    expect(oversized.state.payloadText).toBe("")
    expect(invalidFile.state.payloadText).toBe("")
  })

  it("requires an exact allowlisted profile for the current owner and target", () => {
    const initial = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    const unknown = applyTestInputJsonCommand(
      initial,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE,
      {
        kind: "mapping-profile.select",
        selection: {
          mappingProfileId: "mapping:unknown",
          mappingProfileVersion: 1,
          profileFingerprint: `sha256:${"f".repeat(64)}`,
        },
      },
    )
    const mismatchedOption = {
      ...REALDOC_E55_MAPPING_PROFILES_FIXTURE[0]!,
      profile: {
        ...REALDOC_E55_MAPPING_PROFILES_FIXTURE[0]!.profile,
        target: {
          ...REALDOC_E55_MAPPING_PROFILES_FIXTURE[0]!.profile.target,
          dataContractFingerprint: `sha256:${"b".repeat(64)}`,
        },
      },
    }
    const mismatch = applyTestInputJsonCommand(
      initial,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      [mismatchedOption],
      {
        kind: "mapping-profile.select",
        selection: {
          mappingProfileId: mismatchedOption.profile.mappingProfileId,
          mappingProfileVersion: mismatchedOption.profile.mappingProfileVersion,
          profileFingerprint: mismatchedOption.profile.profileFingerprint,
        },
      },
    )

    expect(unknown).toMatchObject({ status: "blocked", issue: { code: "mapping-profile-unavailable" } })
    expect(mismatch).toMatchObject({ status: "blocked", issue: { code: "mapping-profile-target-mismatch" } })
  })

  it("clears all JSON values when a projection pin changes", () => {
    let state = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "json.text.set", payloadText: "{}" })
    const changedProjection = {
      ...REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      structureFingerprint: `sha256:${"c".repeat(64)}`,
    }
    const reconciled = reconcileTestInputJsonState(state, changedProjection, REALDOC_E55_MAPPING_PROFILES_FIXTURE)

    expect(reconciled.payloadText).toBe("")
    expect(reconciled.mappingProfile).toBeNull()
    expect(reconciled.dirty).toBe(false)
    expect(reconciled.projectionPins.structureFingerprint).toBe(changedProjection.structureFingerprint)
  })

  it("clears only a profile selection that disappears from the exact catalog", () => {
    const option = REALDOC_E55_MAPPING_PROFILES_FIXTURE[0]!
    let state = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
    state = apply(state, { kind: "json.text.set", payloadText: "{}" })
    state = apply(state, {
      kind: "mapping-profile.select",
      selection: {
        mappingProfileId: option.profile.mappingProfileId,
        mappingProfileVersion: option.profile.mappingProfileVersion,
        profileFingerprint: option.profile.profileFingerprint,
      },
    })
    const reconciled = reconcileTestInputJsonState(
      state,
      REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
      REALDOC_E55_MAPPING_PROFILES_FIXTURE.slice(1),
    )

    expect(reconciled.payloadText).toBe("{}")
    expect(reconciled.mappingProfile).toBeNull()
    expect(reconciled.dirty).toBe(true)
    expect(reconciled.revision).toBe(state.revision + 1)
  })
})
