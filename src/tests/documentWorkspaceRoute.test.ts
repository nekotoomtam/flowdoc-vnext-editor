import { describe, expect, it } from "vitest"
import {
  createDocumentWorkspacePath,
  resolveDocumentWorkspaceView,
} from "../app/documentWorkspaceRoute"

describe("document workspace routes", () => {
  it("resolves only the accepted top-level workspace views", () => {
    expect(resolveDocumentWorkspaceView("design")).toBe("design")
    expect(resolveDocumentWorkspaceView("preview")).toBe("preview")
    expect(resolveDocumentWorkspaceView("publish")).toBeNull()
    expect(resolveDocumentWorkspaceView(undefined)).toBeNull()
  })

  it("encodes authoring identity without mixing it with view state", () => {
    expect(createDocumentWorkspacePath("document/alpha", "design"))
      .toBe("/documents/document%2Falpha/design")
    expect(createDocumentWorkspacePath("document/alpha", "preview"))
      .toBe("/documents/document%2Falpha/preview")
  })
})
