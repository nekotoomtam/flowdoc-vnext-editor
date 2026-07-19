import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.3 test-input projection handoff", () => {
  it("accepts Core projection facts without activating Editor test values", () => {
    const doc = read("../../docs/REALDOC_TEST_INPUT_PROJECTION_HANDOFF.md")
    const product = read("../../docs/REALDOC_DOCUMENT_WORKSPACE_PRODUCT_CONTRACT.md")
    const preview = read("../components/preview/PreviewUnavailableView.tsx")

    for (const section of [
      "## Accepted Core Boundary",
      "## Editor Consumption Rule",
      "## Current Workspace State",
      "## Stale Pins For E.5.4",
      "## Explicitly Not Changed",
      "## Next Phase",
    ]) expect(doc).toContain(section)
    expect(doc).toMatch(/one document value identity per field key/)
    expect(doc).toContain("`metadata-unavailable` is not optional or required")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.4`")
    expect(product).toContain("`E.5.3` Core test-input projection accepted")
    expect(preview).toContain("Preview unavailable")
    expect(preview).not.toContain("testInput")
    expect(preview).not.toContain("dataContract")
    expect(preview).not.toContain("mappingProfile")
  })
})
