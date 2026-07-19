import { describe, expect, it } from "vitest"
import {
  createBackendDocumentLibraryReadResult,
  createFlowDocBackendClient,
} from "../editor/backend/backendTransport"

function libraryPage() {
  return {
    contractVersion: 1,
    items: [{
      authoring: { draft: null, status: "migration-required" },
      capabilities: {
        design: { status: "available" },
        preview: { reason: "migration-required", status: "unavailable" },
      },
      contractVersion: 1,
      documentId: "document-a",
      kind: "local-document-library-item",
      published: { latestVersion: null, status: "unavailable" },
      revision: 3,
      thumbnail: { status: "placeholder" },
      title: "Document A",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }],
    kind: "local-document-library-page",
    nextCursor: "next-page",
    scope: {
      authorization: "not-configured",
      kind: "local-workspace",
      workspaceId: "local-development",
    },
    status: "ready",
  }
}

describe("document library transport", () => {
  it("reads a bounded library page through the Backend client", async () => {
    const client = createFlowDocBackendClient({
      baseUrl: "http://backend.test/",
      fetchImpl: async (input) => {
        expect(input).toBe("http://backend.test/documents?limit=24&cursor=next-page")
        return {
          json: async () => libraryPage(),
          ok: true,
          status: 200,
        }
      },
    })

    await expect(client.readDocumentLibrary({ cursor: "next-page", limit: 24 })).resolves.toMatchObject({
      page: {
        items: [{ documentId: "document-a", title: "Document A" }],
        nextCursor: "next-page",
      },
      status: "ready",
    })
  })

  it("rejects content-bearing or malformed list responses", () => {
    const contentBearingPage = libraryPage()
    Object.assign(contentBearingPage.items[0], { packageValue: { secret: true } })

    expect(createBackendDocumentLibraryReadResult(contentBearingPage, 200)).toMatchObject({
      issues: [{ path: "items[0]" }],
      status: "invalid-response",
    })
    expect(createBackendDocumentLibraryReadResult({ status: "ready" }, 200)).toMatchObject({
      status: "invalid-response",
    })
  })
})
