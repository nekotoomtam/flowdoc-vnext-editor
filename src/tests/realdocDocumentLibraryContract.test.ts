import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.1 local Document Library", () => {
  it("retains the local-only product and transport boundary", () => {
    const doc = read("../../docs/REALDOC_DOCUMENT_LIBRARY.md")
    const routes = read("../app/FlowDocApp.tsx")
    const library = read("../components/library/DocumentLibraryPage.tsx")
    const transport = read("../editor/backend/backendTransport.ts")

    expect(doc).toContain("Status: `PDF-EXPORT-REALDOC-E.5.1` accepted")
    expect(doc).toContain("authorization: not-configured")
    expect(doc).toContain("Production remains NO-GO")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.2`")
    expect(routes).toContain('path="/documents"')
    expect(routes).toContain('path="/documents/:documentId/design"')
    expect(routes).not.toContain('path="/documents/:documentId/preview"')
    expect(library).toContain("readDocumentLibrary")
    expect(library).toContain("Migration required")
    expect(library).toContain("Preview will be added in the next phase")
    expect(transport).toContain("hasExactKeys")
    expect(transport).toContain("document library item has an invalid shape")
  })
})
