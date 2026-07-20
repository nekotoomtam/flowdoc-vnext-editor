import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.9 Editor handoff", () => {
  it("documents dynamic Form admission without browser-owned canonical truth", () => {
    const doc = read("../../docs/REALDOC_FORM_API_PARITY.md")
    const routes = read("../app/FlowDocApp.tsx")

    for (const section of [
      "## Dynamic Form Contract",
      "## Import And Candidate UX",
      "## Shared Preview Lifecycle",
      "## Browser Ownership Boundary",
      "## Accepted QA",
      "## Explicitly Not Changed",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toContain("`editor-form-canonical-candidate`")
    expect(doc).toContain("UTF-8 JSON with or without a BOM")
    expect(doc).toContain("input lane `Form direct`")
    expect(doc).toContain("parity fingerprint prefix `f21638952df9`")
    expect(doc).toContain("makes no byte-parity claim")
    expect(routes).toContain('path="/__qa/realdoc-e5-9-form-api-parity"')
  })
})
