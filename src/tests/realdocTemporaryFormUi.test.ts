import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PreviewTestInputView } from "../components/preview/PreviewTestInputView"
import { createTestInputFormState } from "../editor/preview/testInputFormState"
import { REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE } from "../fixtures/realdocE54TestInputProjectionFixture"
import type { PreviewTestInputFormInteraction } from "../app/usePreviewTestInputForm"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.4 generated Form UI", () => {
  it("renders scalar, image, collection, and unplaced controls from the Core projection", () => {
    const interaction: PreviewTestInputFormInteraction = {
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
    }
    const markup = renderToStaticMarkup(createElement(PreviewTestInputView, {
      document: { id: "qa", title: "QA document", packageVersion: 3, documentVersion: 4 },
      interaction,
      projection: REALDOC_E54_TEST_INPUT_PROJECTION_FIXTURE,
    }))

    expect(markup).toContain("Test data")
    expect(markup).toContain("Document title")
    expect(markup).toContain("Report date")
    expect(markup).toContain("Approved")
    expect(markup).toContain("Choose image")
    expect(markup).toContain("Entries")
    expect(markup).toContain("Not placed")
    expect(markup).toContain("Requirement unavailable")
    expect(markup).toContain("Exact preview not generated")
    expect(markup).not.toContain("Generate PDF")
  })

  it("keeps the QA projection local-only and leaves normal Preview fail-closed", () => {
    const handoff = read("../../docs/REALDOC_TEMPORARY_FORM_STATE.md")
    const routes = read("../app/FlowDocApp.tsx")
    const shell = read("../app/EditorShell.tsx")
    const formState = read("../editor/preview/testInputFormState.ts")

    expect(handoff).toContain("Status: `PDF-EXPORT-REALDOC-E.5.4` accepted")
    expect(handoff).toContain("## State Contract")
    expect(handoff).toContain("## Generated Controls")
    expect(handoff).toContain("`PDF-EXPORT-REALDOC-E.5.5`")
    expect(routes).toContain("import.meta.env.DEV")
    expect(routes).toContain('path="/__qa/realdoc-e5-4-form"')
    expect(shell).toContain("testInputProjection && previewTestInput.state")
    expect(shell).toContain("PreviewUnavailableView")
    expect(formState).toContain('storage: "memory-only"')
    expect(formState).not.toContain("localStorage")
    expect(formState).not.toContain("sessionStorage")
    expect(formState).not.toContain("indexedDB")
    expect(formState).not.toContain("fetch(")
    expect(formState).not.toContain("console.")
  })
})
