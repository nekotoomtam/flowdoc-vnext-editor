import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.8 Editor lifecycle UX handoff", () => {
  it("documents complete local recovery and bounded large-input behavior", () => {
    const doc = read("../../docs/REALDOC_PREVIEW_LIFECYCLE_UX.md")
    const routes = read("../app/FlowDocApp.tsx")
    const lifecycle = read("../editor/preview/exactPreviewLifecycle.ts")
    const input = read("../editor/preview/testInputJsonState.ts")

    for (const section of [
      "## Lifecycle Model",
      "## Recovery Controls",
      "## Result Diagnostics",
      "## Large JSON Interaction",
      "## Local QA",
      "## Explicitly Not Changed",
      "## Risks",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(routes).toContain('path="/__qa/realdoc-e5-8-preview-lifecycle"')
    expect(lifecycle).toContain('"cancel-failed"')
    expect(lifecycle).toContain('"Retry cancel"')
    expect(input).toContain("REALDOC_E58_LARGE_JSON_EDITOR_BYTES = 256 * 1024")
    expect(doc).toContain("pending cancellation")
    expect(doc).toContain("Backend-unavailable failure")
    expect(doc).toContain("390 x 844")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.9`")
    expect(doc).toContain("Production remains NO-GO")
  })
})
