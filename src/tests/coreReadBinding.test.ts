import { describe, expect, it } from "vitest"
import { loadReadOnlyCoreSnapshot } from "../core/coreAdapter"
import { bindFrontendCoreWorkingSetFromReadResult } from "../editor/coreBinding/workingSetFactory"

describe("real core read binding contract", () => {
  it("binds a fresh read-only core result envelope into a frontend working set", () => {
    const readResult = loadReadOnlyCoreSnapshot({
      baseRevision: 3,
      createdAt: 100,
      documentId: "placeholder-document",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.request).toMatchObject({
      baseRevision: 3,
      documentId: "placeholder-document",
      requireDiagnostics: true,
      requireRenderProjection: true,
      sourceKind: "fixture",
    })
    expect(readResult.envelope).toMatchObject({
      baseRevision: 3,
      coreRevision: "fixture:3",
      documentId: "placeholder-document",
      documentRevision: 3,
      failures: [],
      snapshotRevision: 3,
      status: "fresh",
    })
    expect(binding).toMatchObject({
      failures: [],
      status: "bound",
    })
    expect(binding.workingSet?.envelope).toMatchObject({
      documentId: "placeholder-document",
      documentRevision: 3,
      failures: [],
      status: "fresh",
    })
    expect(binding.workingSet?.renderProjection).toMatchObject({
      documentId: "placeholder-document",
      sourceRevision: 3,
    })
  })

  it("blocks a read result when the returned document does not match the request", () => {
    const readResult = loadReadOnlyCoreSnapshot({
      baseRevision: 3,
      documentId: "requested-document",
      fixtureDocumentId: "returned-document",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "requested-document",
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        code: "document-mismatch",
        documentId: "returned-document",
        expectedDocumentId: "requested-document",
      }),
    ])
    expect(binding).toMatchObject({
      status: "blocked",
      workingSet: null,
    })
  })

  it("blocks a read result when the requested base revision is stale", () => {
    const readResult = loadReadOnlyCoreSnapshot({
      baseRevision: 2,
      documentId: "placeholder-document",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      baseRevision: 2,
      documentRevision: 3,
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        baseRevision: 2,
        code: "revision-stale",
        sourceRevision: 3,
      }),
    ])
    expect(binding.status).toBe("blocked")
    expect(binding.workingSet).toBeNull()
  })

  it("binds partial read results with controlled missing-data failures", () => {
    const readResult = loadReadOnlyCoreSnapshot({
      baseRevision: 3,
      documentId: "placeholder-document",
      simulateMissingDiagnostics: true,
      simulateMissingRenderProjection: true,
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "placeholder-document",
      documentRevision: 3,
      status: "partial",
    })
    expect(readResult.envelope.failures.map((failure) => failure.code)).toEqual([
      "missing-diagnostics",
      "missing-render-projection",
    ])
    expect(binding.status).toBe("bound")
    expect(binding.workingSet?.envelope).toMatchObject({
      failures: [
        expect.objectContaining({ code: "missing-diagnostics" }),
        expect.objectContaining({ code: "missing-render-projection" }),
      ],
      status: "partial",
    })
    expect(binding.workingSet?.diagnostics.keyDataStatus).toBe("unknown")
    expect(binding.workingSet?.renderProjection).toBeNull()
  })
})
