import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PreviewTestInputView } from "../components/preview/PreviewTestInputView"
import { createTestInputFormState } from "../editor/preview/testInputFormState"
import {
  applyTestInputJsonCommand,
  createTestInputJsonDiagnostics,
  createTestInputJsonState,
} from "../editor/preview/testInputJsonState"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"
import { REALDOC_E55_MAPPING_PROFILES_FIXTURE } from "../fixtures/realdocE55MappingProfilesFixture"
import type { PreviewTestInputInteraction } from "../app/usePreviewTestInput"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

function interactionFor(payloadText: string): PreviewTestInputInteraction {
  const initial = createTestInputJsonState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE)
  const state = applyTestInputJsonCommand(
    initial,
    REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    REALDOC_E55_MAPPING_PROFILES_FIXTURE,
    { kind: "json.text.set", payloadText },
  ).state
  return {
    mode: "json",
    form: {
      state: createTestInputFormState(REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE),
      lastIssue: null,
      addCollectionItem: vi.fn(),
      removeCollectionItem: vi.fn(),
      reset: vi.fn(),
      setCollectionIncluded: vi.fn(),
      setCollectionItemImage: vi.fn(),
      setCollectionItemKey: vi.fn(),
      setCollectionItemValue: vi.fn(),
      setDocumentImage: vi.fn(),
      setDocumentValue: vi.fn(),
      getSelectedFile: vi.fn(() => null),
    },
    json: {
      state,
      diagnostics: createTestInputJsonDiagnostics(
        state,
        REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
        REALDOC_E55_MAPPING_PROFILES_FIXTURE,
      ),
      lastIssue: null,
      mappingProfiles: REALDOC_E55_MAPPING_PROFILES_FIXTURE,
      clearPayload: vi.fn(),
      reset: vi.fn(),
      selectFile: vi.fn(async () => undefined),
      selectMappingProfile: vi.fn(),
      setPayloadText: vi.fn(() => true),
    },
    resetActive: vi.fn(),
    setMode: vi.fn(),
  }
}

describe("PDF-EXPORT-REALDOC-E.5.5 JSON and mapping UI", () => {
  it("renders JSON selection, exact profiles, local diagnostics, and no generation action", () => {
    const interaction = interactionFor('{"records":[]}')
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document: { id: "qa", title: "QA document", packageVersion: 3, documentVersion: 4 },
      interaction,
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    }))

    expect(markup).toContain("Form")
    expect(markup).toContain("JSON payload")
    expect(markup).toContain("Choose JSON")
    expect(markup).toContain("Mapping profile")
    expect(markup).toContain("Requirements JSON")
    expect(markup).toContain("Local checks")
    expect(markup).toContain("Mapping")
    expect(markup).toContain("Not run")
    expect(markup).toContain("Exact preview not generated")
    expect(markup).not.toContain("Generate PDF")
  })

  it("keeps a large JSON payload out of the live textarea until editing is requested", () => {
    const marker = "large-payload-marker"
    const interaction = interactionFor(JSON.stringify({
      marker,
      records: ["x".repeat(270 * 1024)],
    }))
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document: { id: "qa", title: "QA document", packageVersion: 3, documentVersion: 4 },
      interaction,
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    }))

    expect(markup).toContain("Large JSON loaded")
    expect(markup).toContain("Edit JSON")
    expect(markup).not.toContain(marker)
  })

  it("keeps JSON local-only and normal Preview fail-closed", () => {
    const handoff = read("../../docs/REALDOC_TEMPORARY_JSON_MAPPING_STATE.md")
    const routes = read("../app/FlowDocApp.tsx")
    const shell = read("../app/EditorShell.tsx")
    const state = read("../editor/preview/testInputJsonState.ts")
    const hook = read("../app/usePreviewTestInput.ts")

    expect(handoff).toContain("Status: `PDF-EXPORT-REALDOC-E.5.5` accepted")
    expect(handoff).toContain("## Profile Boundary")
    expect(handoff).toContain("## Local Diagnostics")
    expect(handoff).toContain("`ready-for-admission`")
    expect(handoff).toContain("`PDF-EXPORT-REALDOC-E.5.6`")
    expect(routes).toContain("import.meta.env.DEV")
    expect(routes).toContain('path="/__qa/realdoc-e5-5-input"')
    expect(shell).toContain("PreviewContextStateView")
    expect(state).toContain('storage: "memory-only"')
    expect(state).toContain('mapping: "not-run"')
    expect(state).not.toContain("localStorage")
    expect(state).not.toContain("sessionStorage")
    expect(state).not.toContain("indexedDB")
    expect(state).not.toContain("fetch(")
    expect(state).not.toContain("console.")
    expect(hook).not.toContain("fetch(")
    expect(hook).not.toContain("console.")
  })
})
