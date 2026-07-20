import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (relativePath: string): string => readFileSync(new URL(relativePath, import.meta.url), "utf8")

describe("LIVE-DRAFT-XR-0 placeholder baseline", () => {
  it("records that layout.live and Form preview do not yet produce pages", () => {
    const jobs = read("./jobs.test.ts")
    const formUi = read("./realdocTemporaryFormUi.test.ts")
    const preview = read("../components/preview/PreviewTestInputView.tsx")
    const generation = read("../app/usePublishedPreviewGeneration.ts")

    expect(jobs).toContain("Live layout placeholder completed")
    expect(formUi).toContain("Exact preview not generated")
    expect(preview).toContain("Exact preview not generated")
    expect(generation).toContain("generate(")
    expect(generation).not.toContain("layout.live")
    expect(generation).not.toContain("new Worker")
  })
})
