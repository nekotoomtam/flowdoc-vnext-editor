import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("PDF-EXPORT-REALDOC-E.0-E.5.4 Editor pre-test boundary", () => {
  it("keeps Structure authoring separate from imported test values", () => {
    const doc = read("../../docs/REALDOC_DOCGEN_PRETEST_BOUNDARY.md")

    for (const section of [
      "## Product Role",
      "## Field And Presentation UX",
      "## Pre-Test Role",
      "## Shared DocGen Path",
      "## E.1 Pre-Test Handoff",
      "## E.2 Pre-Test Handoff",
      "## E.3 Pre-Test Handoff",
      "## E.4 Pre-Test Handoff",
      "## E.5.0 Product Contract Lock",
      "## E.5.1 Local Library",
      "## E.5.3 Projection Handoff",
      "## E.5.4 Temporary Form Handoff",
      "## Existing Local PDF Controls",
      "## Book-Form UX Pressure",
      "## Explicitly Not Changed",
      "## RISK",
      "## UNKNOWN",
      "## Next Phase",
    ]) expect(doc).toContain(section)

    expect(doc).toMatch(/primary saved\s+and published artifact is a reusable document structure/)
    expect(doc).toMatch(/Imported values must not be written into field definitions/)
    expect(doc).toMatch(/external API caller enters the same Backend boundary/)
    expect(doc).toMatch(/does not become the\s+canonical mapper, resolver, paginator, renderer/i)
    expect(doc).toContain("`runtime-validation-required`")
    expect(doc).toContain("`mapping-required`")
    expect(doc).toMatch(/No E\.1 contract is stored in authored Structure state/)
    expect(doc).toMatch(/direct canonical snapshots and identity-pinned adapted\s+JSON can converge/)
    expect(doc).toMatch(/This does not move mapping into the Editor/)
    expect(doc).toMatch(/browser cannot submit executable mapper code/)
    expect(doc).toMatch(/E\.2 adds no file picker, mapping-profile selector/)
    expect(doc).toMatch(/Backend now accepts one strict local DocGen request/)
    expect(doc).toMatch(/This phase deliberately does not connect the Editor/)
    expect(doc).toMatch(/Backend now accepts the E\.3 `instanceId` and revision/)
    expect(doc).toContain("`PDF-EXPORT-REALDOC-E.5.4` now accepts Editor-owned temporary Form state")
    expect(doc).toContain("E.5.5 next adds JSON and mapping-profile selection")
  })

  it("does not reinterpret the LOCAL-F document pin as DocGen admission", () => {
    const doc = read("../../docs/REALDOC_DOCGEN_PRETEST_BOUNDARY.md")
    const localIntegration = read("../../docs/PDF_EXPORT_LOCAL_EDITOR_INTEGRATION.md")
    const localTransport = read("../editor/pdfExport/localPdfExportTransport.ts")

    expect(doc).toMatch(/it is not the future DocGen input envelope/)
    expect(doc).toMatch(/does not relabel the current product document as eligible/)
    expect(localTransport).toContain("documentId")
    expect(localTransport).toContain("documentRevision")
    expect(localTransport).not.toContain("mappingProfile")
    expect(localTransport).not.toContain("adapted-payload-input")
    expect(localTransport).not.toContain("payloadText")
    expect(localIntegration).not.toContain("trusted product-readable document revision")
    expect(localIntegration).toMatch(/REALDOC-E\.1 now accepts the pure Core input plan/)
    expect(localIntegration).toMatch(/REALDOC-E\.2 now proves exact payload\/mapper execution/)
    expect(localIntegration).toMatch(/REALDOC-E\.3 now accepts the separate optional Backend/)
    expect(localIntegration).toMatch(/REALDOC-E\.4 now completes that Backend binding/)
    expect(localIntegration).toMatch(/REALDOC-E\.5\.0 locks that product surface/)
    expect(localIntegration).toMatch(/REALDOC-E\.5\.1 now adds/)
    expect(localIntegration).toMatch(/E\.5\.4 now accepts temporary Editor Form state/)
  })
})
