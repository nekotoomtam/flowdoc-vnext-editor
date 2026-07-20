import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  clampPublishedPreviewZoom,
  createPublishedPreviewPageNumbers,
} from "../components/preview/PublishedPreviewPdf"

describe("Published Preview PDF page surface", () => {
  it("creates stable one-based page numbers", () => {
    expect(createPublishedPreviewPageNumbers(3)).toEqual([1, 2, 3])
    expect(createPublishedPreviewPageNumbers(0)).toEqual([])
    expect(createPublishedPreviewPageNumbers(-2)).toEqual([])
  })

  it("keeps zoom within the supported visual range", () => {
    expect(clampPublishedPreviewZoom(0.5)).toBe(0.75)
    expect(clampPublishedPreviewZoom(1.25)).toBe(1.25)
    expect(clampPublishedPreviewZoom(2)).toBe(1.5)
  })

  it("loads the exact artifact and renders every page to canvas without an iframe", () => {
    const source = readFileSync(new URL("../components/preview/PublishedPreviewPdf.tsx", import.meta.url), "utf8")
    expect(source).toContain("fetch(url")
    expect(source).toContain("pdfjs.getDocument({ data: bytes })")
    expect(source).toContain("page.render({ canvas, viewport: renderViewport })")
    expect(source).toContain("createPublishedPreviewPageNumbers(loadState.document.numPages)")
    expect(source).not.toContain("<iframe")
  })
})
