import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.6 Editor handoff", () => {
  it("documents the dynamic Form draft and content-free Published result", () => {
    const doc = read("../../docs/REALDOC_PUBLISHED_PREVIEW.md")

    for (const section of [
      "## Trusted Context",
      "## Form Canonical Candidate",
      "## Imported JSON And Mapped Result",
      "## Local QA",
      "## Explicitly Not Changed",
      "## Risks",
      "## Next Phase",
    ]) expect(doc).toContain(section)
    expect(doc).toContain("`draft-not-validated`")
    expect(doc).toContain("`editor-form-canonical-candidate`")
    expect(doc).toMatch(/never displays or stores\s+the mapped canonical values/)
    expect(doc).toContain("749,929-byte adapted JSON")
    expect(doc).toContain("completed a 10-page exact PDF")
    expect(doc).toContain("390 x 844")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.7`")
    expect(doc).toContain("Production remains NO-GO")
  })

  it("keeps the QA route development-only and normal Preview fail-closed", () => {
    const routes = read("../app/FlowDocApp.tsx")
    const editor = read("../app/EditorApp.tsx")
    const generation = read("../app/usePublishedPreviewGeneration.ts")
    const transport = read("../editor/preview/publishedPreviewTransport.ts")

    expect(routes).toContain("import.meta.env.DEV")
    expect(routes).toContain('path="/__qa/realdoc-e5-6-published-preview"')
    expect(editor).toContain("effectiveTestInputProjection")
    expect(editor).toContain("publishedPreviewContext.context")
    expect(generation).toContain("run.current !== runId")
    expect(generation).toContain("context.authoring.documentRevision")
    expect(transport).toContain("/docgen-local/admissions")
    expect(transport).not.toContain("implementationFingerprint")
  })
})
