import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.6.1 Editor lifecycle handoff", () => {
  it("accepts truthful durability projection without claiming reconnect", () => {
    const doc = read("../../docs/REALDOC_CROSS_REPO_LIFECYCLE.md")

    for (const section of [
      "## Editor Boundary",
      "## Sanitized Receipt",
      "## Accepted Evidence",
      "## Remaining E.6",
      "## Explicitly Not Changed",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toContain("Status: `PDF-EXPORT-REALDOC-E.6.1` accepted")
    expect(doc).toContain("preserves Backend `durablePersistence` as a boolean")
    expect(doc).toContain("no automatic reconnect or resume UI acceptance")
    expect(doc).toContain("`E.6.2` and `E.6.3` remain pending")
    expect(doc).toContain("Production remains NO-GO")
  })
})
