import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.5.0 Document Workspace product contract", () => {
  it("locks the Library and URL-backed Design/Preview workspace without activating it", () => {
    const doc = read("../../docs/REALDOC_DOCUMENT_WORKSPACE_PRODUCT_CONTRACT.md")
    const app = read("../app/EditorApp.tsx")
    const main = read("../main.tsx")
    const packageJson = JSON.parse(read("../../package.json")) as {
      dependencies: Record<string, string>
    }

    for (const section of [
      "## Decision",
      "## Current Baseline",
      "## Navigation Contract",
      "## Local Library Read Model",
      "## Workspace Header",
      "## Design View",
      "## Preview View",
      "## Generated Form Boundary",
      "## State Ownership",
      "## Preview Targets",
      "## Staleness Contract",
      "## Preview Lifecycle",
      "## Phase Order",
      "## Explicitly Not Changed",
      "## PASS",
      "## RISK",
      "## UNKNOWN",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toContain("`/documents`")
    expect(doc).toContain("`/documents/:documentId/design`")
    expect(doc).toContain("`/documents/:documentId/preview`")
    expect(doc).toMatch(/selected top tab is URL state/)
    expect(doc).toMatch(/local-workspace only/)
    expect(doc).toMatch(/must not claim that its list is securely user-scoped/)
    expect(app).toContain("VITE_FLOWDOC_DOCUMENT_ID")
    expect(main).toContain("<EditorApp />")
    expect(packageJson.dependencies["react-router-dom"]).toBeUndefined()
  })

  it("separates authored Structure, generated Form data, and Preview identity", () => {
    const doc = read("../../docs/REALDOC_DOCUMENT_WORKSPACE_PRODUCT_CONTRACT.md")

    expect(doc).toMatch(
      /One field key produces one Form value even when the Structure places that field\s+multiple times/,
    )
    expect(doc).toMatch(/does not represent scalar requiredness, enum choices/)
    expect(doc).toMatch(/Core must not invent these\s+facts/)
    expect(doc).toMatch(/Form mode is not a browser mapper/)
    expect(doc).toMatch(/Both modes must converge on the same Core canonical snapshot validator/)
    expect(doc).toMatch(/Draft Preview cannot call the Published admission route/)
    expect(doc).toMatch(/A Draft artifact cannot be presented as\s+API-parity evidence/)
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.1`")

    for (const inactiveClaim of [
      "Library route is active",
      "generated Form is active",
      "production is ready",
    ]) expect(doc).not.toContain(inactiveClaim)
  })
})
