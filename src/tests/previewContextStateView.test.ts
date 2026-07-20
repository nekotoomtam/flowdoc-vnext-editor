import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PreviewContextStateView } from "../components/preview/PreviewContextStateView"

const document = { id: "qa", title: "69C QA", packageVersion: 3, documentVersion: 4 }

describe("PDF-EXPORT-REALDOC-E.5.8 preview context state", () => {
  it("renders an honest loading state without a retry action", () => {
    const markup = renderToStaticMarkup(createElement(PreviewContextStateView, {
      document,
      onRetry: vi.fn(),
      onSelectTarget: vi.fn(),
      statuses: { draft: "checking", published: "ready" },
      target: "draft",
    }))

    expect(markup).toContain("Loading Preview")
    expect(markup).toContain("69C QA")
    expect(markup).not.toContain(">Retry<")
  })

  it("keeps both targets visible and exposes retry for an unavailable context", () => {
    const markup = renderToStaticMarkup(createElement(PreviewContextStateView, {
      document,
      onRetry: vi.fn(),
      onSelectTarget: vi.fn(),
      statuses: { draft: "unavailable", published: "ready" },
      target: "draft",
    }))

    expect(markup).toContain("Preview unavailable")
    expect(markup).toContain(">Retry<")
    expect(markup).toContain(">Draft</button>")
    expect(markup).toContain(">Published</button>")
  })
})
