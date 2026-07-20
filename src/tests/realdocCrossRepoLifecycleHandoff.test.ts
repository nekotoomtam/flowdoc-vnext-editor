import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.6.2 Editor lifecycle handoff", () => {
  it("records durable Backend recovery without claiming Editor reconnect", () => {
    const doc = read("../../docs/REALDOC_CROSS_REPO_LIFECYCLE.md")

    for (const section of [
      "## Editor Boundary",
      "## Sanitized Receipt",
      "## Accepted Evidence",
      "## Backend Durable Lifecycle",
      "## Remaining E.6",
      "## Explicitly Not Changed",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toContain("Backend `PDF-EXPORT-REALDOC-E.6.2` durable lifecycle accepted")
    expect(doc).toContain("preserves Backend `durablePersistence` as a boolean")
    expect(doc).toContain("no automatic reconnect or resume UI acceptance")
    expect(doc).toContain("four independent Node processes")
    expect(doc).toContain("1,417,544-byte download")
    expect(doc).toContain("Editor reconnect remains `E.6.3`")
    expect(doc).toContain("Production remains NO-GO")
  })
})
