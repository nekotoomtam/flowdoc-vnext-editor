import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.0 Editor pre-test boundary", () => {
  it("keeps Structure authoring separate from imported test values", () => {
    const doc = read("../../docs/REALDOC_DOCGEN_PRETEST_BOUNDARY.md")

    for (const section of [
      "## Product Role",
      "## Field And Presentation UX",
      "## Pre-Test Role",
      "## Shared DocGen Path",
      "## Existing Local PDF Controls",
      "## Book-Form UX Pressure",
      "## Explicitly Not Changed",
      "## RISK",
      "## UNKNOWN",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toMatch(/primary saved\s+and published artifact is a reusable document structure/)
    expect(doc).toMatch(/Imported values must not be written into field definitions/)
    expect(doc).toMatch(/external API caller enters the same Backend boundary/)
    expect(doc).toMatch(/does not become the\s+canonical mapper, resolver, paginator, renderer/i)
  })

  it("does not reinterpret the LOCAL-F document pin as DocGen admission", () => {
    const doc = read("../../docs/REALDOC_DOCGEN_PRETEST_BOUNDARY.md")
    const localIntegration = read("../../docs/PDF_EXPORT_LOCAL_EDITOR_INTEGRATION.md")
    const localTransport = read("../editor/pdfExport/localPdfExportTransport.ts")

    expect(doc).toMatch(/it is not the future DocGen input envelope/)
    expect(doc).toMatch(/does not relabel the current product document as eligible/)
    expect(localTransport).toContain("documentId")
    expect(localTransport).toContain("documentRevision")
    expect(localTransport).not.toContain("mappingProfile")
    expect(localIntegration).not.toContain("trusted product-readable document revision")
  })
})
