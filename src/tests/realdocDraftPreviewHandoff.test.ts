import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.7 Editor handoff", () => {
  it("documents distinct target identity and target-specific result invalidation", () => {
    const doc = read("../../docs/REALDOC_DRAFT_PREVIEW.md")

    for (const section of [
      "## Target Selection",
      "## Strict Draft Context",
      "## Exact Preview Flow",
      "## Local QA",
      "## Explicitly Not Changed",
      "## Risks",
      "## Next Phase",
    ]) expect(doc).toContain(section)
    expect(doc).toContain("`publishedApiParity: false`")
    expect(doc).toContain("749,929-byte JSON")
    expect(doc).toContain("exact 10-page PDF")
    expect(doc).toContain("390 x 844")
    expect(doc).toContain("arbitrary live Editor drafts")
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.8`")
    expect(doc).toContain("Production remains NO-GO")
  })

  it("keeps Draft transport separate and the QA route development-only", () => {
    const routes = read("../app/FlowDocApp.tsx")
    const qa = read("../components/preview/PublishedPreviewQaPage.tsx")
    const transport = read("../editor/preview/draftPreviewTransport.ts")
    const generation = read("../app/usePublishedPreviewGeneration.ts")

    expect(routes).toContain("import.meta.env.DEV")
    expect(routes).toContain('path="/__qa/realdoc-e5-7-draft-preview"')
    expect(qa).toContain('useState<"draft" | "published">("draft")')
    expect(transport).toContain("/docgen-local/draft-preview-admissions")
    expect(transport).not.toContain('path: "/docgen-local/admissions"')
    expect(generation).toContain('target: "draft" | "published"')
  })
})
