import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.2 document workspace tabs", () => {
  it("retains one document-keyed runtime across URL-backed views", () => {
    const doc = read("../../docs/REALDOC_DOCUMENT_WORKSPACE_TABS.md")
    const routes = read("../app/FlowDocApp.tsx")
    const shell = read("../app/EditorShell.tsx")
    const header = read("../components/shell/AppHeader.tsx")
    const preview = read("../components/preview/PreviewUnavailableView.tsx")

    expect(doc).toContain("Status: `PDF-EXPORT-REALDOC-E.5.2` accepted")
    expect(doc).toContain("Production remains NO-GO")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.3` now accepts")
    expect(doc).toMatch(/E\.5\.4 next adds temporary\s+Editor Form state/)
    expect(routes).toContain('path="/documents/:documentId/:view"')
    expect(routes).toContain("key={documentId}")
    expect(routes).not.toContain("key={activeView}")
    expect(shell).toContain('hidden={activeWorkspaceView !== "design"}')
    expect(header).toContain('role="tablist"')
    expect(header).toContain('role="tab"')
    expect(preview).toContain("Preview unavailable")
    expect(preview).toContain("Migration required")
    expect(preview).not.toContain("mappingProfile")
    expect(preview).not.toContain("payload")
  })
})
