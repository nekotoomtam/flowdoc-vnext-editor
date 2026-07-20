import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.6.3 Editor lifecycle handoff", () => {
  it("records strict Editor reconnect over durable Backend recovery", () => {
    const doc = read("../../docs/REALDOC_CROSS_REPO_LIFECYCLE.md")

    for (const section of [
      "## Decision",
      "## Session Reconnect Record",
      "## Exact Resume",
      "## Stale Result Rejection",
      "## Cancellation Reconciliation",
      "## Accepted Evidence",
      "## Explicitly Not Changed",
      "## Next Decision",
    ]) expect(doc).toContain(section)

    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.6.3` accepted")
    expect(doc).toContain("strict versioned record in `sessionStorage`")
    expect(doc).toContain("replays the exact PDF")
    expect(doc).toContain("result is marked `Stale result`")
    expect(doc).toContain("1,417,544-byte artifact")
    expect(doc).toContain("four durable repository opens")
    expect(doc).toContain("Production remains NO-GO")
  })
})
