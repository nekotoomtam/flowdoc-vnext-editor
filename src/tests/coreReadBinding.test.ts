import { describe, expect, it } from "vitest"
import {
  CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
  loadReadOnlyCoreSnapshot,
  loadReadOnlyCoreSnapshotFromEnvelope,
  loadReadOnlyCoreSnapshotFromPackage,
} from "../core/coreAdapter"
import { bindFrontendCoreWorkingSetFromReadResult } from "../editor/coreBinding/workingSetFactory"

function canonicalPackageFixture(documentId = "caller-package"): unknown {
  return {
    packageVersion: 2,
    kind: "document",
    id: documentId,
    meta: {
      title: "Caller Package",
    },
    fields: {
      version: 1,
      fields: {},
    },
    document: {
      version: 3,
      document: {
        id: documentId,
        meta: {
          title: "Caller Package",
        },
        sections: [
          {
            id: "section-main",
            type: "section",
            page: {
              size: "A4",
              orientation: "portrait",
              margin: {
                top: { value: 20, unit: "mm" },
                right: { value: 20, unit: "mm" },
                bottom: { value: 20, unit: "mm" },
                left: { value: 20, unit: "mm" },
              },
            },
            zoneIds: ["zone-body"],
            nodes: {
              "zone-body": {
                id: "zone-body",
                type: "zone",
                role: "body",
                childIds: ["body-text"],
              },
              "body-text": {
                id: "body-text",
                type: "text-block",
                role: { role: "paragraph" },
                props: {},
                children: [
                  {
                    id: "body-run",
                    type: "text",
                    text: "Caller package body",
                  },
                ],
              },
            },
          },
        ],
      },
    },
  }
}

function transportEnvelopeFixture(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const documentId = typeof overrides.documentId === "string"
    ? overrides.documentId
    : "caller-package"

  return {
    baseRevision: 3,
    documentId,
    envelopeId: "transport-envelope-1",
    packageValue: canonicalPackageFixture(documentId),
    purpose: "refresh",
    receivedAt: 120,
    requestedAt: 100,
    sourceKind: "api",
    ...overrides,
  }
}

describe("real core read binding contract", () => {
  it("binds the public core runtime fixture through the adapter boundary", () => {
    const readResult = loadReadOnlyCoreSnapshot({
      baseRevision: 3,
      createdAt: 100,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      baseRevision: 3,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      documentRevision: 3,
      failures: [],
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(binding.status).toBe("bound")
    expect(binding.workingSet?.document).toMatchObject({
      id: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      title: "Product Report vNext Minimal",
    })
    expect(binding.workingSet?.readModel.nodeById.title).toMatchObject({
      label: "Product Report for Customer",
      parentId: "zone-cover-body",
      type: "text-block",
    })
    expect(binding.workingSet?.readModel.childrenById["summary-columns"]).toEqual([
      "summary-left",
      "summary-right",
    ])
    expect(binding.workingSet?.renderProjection).toMatchObject({
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      sourceRevision: 3,
    })
  })

  it("binds caller-supplied canonical package input through the adapter boundary", () => {
    const packageFixture = canonicalPackageFixture()
    const readResult = loadReadOnlyCoreSnapshotFromPackage(packageFixture, {
      baseRevision: 3,
      createdAt: 100,
      documentId: "caller-package",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.request).toMatchObject({
      baseRevision: 3,
      documentId: "caller-package",
      requireDiagnostics: true,
      requireRenderProjection: true,
      sourceKind: "api",
    })
    expect(readResult.envelope).toMatchObject({
      baseRevision: 3,
      coreRevision: "api:caller-package:3",
      documentId: "caller-package",
      documentRevision: 3,
      failures: [],
      snapshotRevision: 3,
      sourceKind: "api",
      status: "fresh",
    })
    expect(binding.status).toBe("bound")
    expect(binding.workingSet?.document).toMatchObject({
      id: "caller-package",
      title: "Caller Package",
    })
    expect(binding.workingSet?.readModel.nodeById["body-text"]).toMatchObject({
      label: "Caller package body",
      parentId: "zone-body",
      type: "text-block",
    })
    expect(binding.workingSet?.renderProjection).toMatchObject({
      documentId: "caller-package",
      sourceRevision: 3,
    })
  })

  it("blocks invalid caller-supplied package input before working set creation", () => {
    const readResult = loadReadOnlyCoreSnapshotFromPackage({
      document: {
        id: "broken-package",
      },
      packageVersion: 2,
    }, {
      documentId: "broken-package",
    })
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      coreRevision: null,
      documentId: "broken-package",
      documentRevision: null,
      snapshotRevision: null,
      sourceKind: "api",
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        code: "invalid-envelope",
        documentId: "broken-package",
      }),
    ])
    expect(binding).toMatchObject({
      status: "blocked",
      workingSet: null,
    })
  })

  it("blocks caller-supplied package input for a different document", () => {
    const readResult = loadReadOnlyCoreSnapshotFromPackage(
      canonicalPackageFixture("returned-document"),
      {
        baseRevision: 3,
        documentId: "requested-document",
      },
    )
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "requested-document",
      documentRevision: 3,
      sourceKind: "api",
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

  it("binds a valid transport envelope through the read-only adapter gate", () => {
    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(
      transportEnvelopeFixture(),
      {
        documentId: "caller-package",
        documentRevision: 3,
      },
    )
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      baseRevision: 3,
      coreRevision: "api:caller-package:3",
      documentId: "caller-package",
      documentRevision: 3,
      failures: [],
      receivedAt: 120,
      sourceKind: "api",
      status: "fresh",
    })
    expect(binding.status).toBe("bound")
    expect(binding.workingSet?.document).toMatchObject({
      id: "caller-package",
      title: "Caller Package",
    })
    expect(binding.workingSet).not.toHaveProperty("packageValue")
    expect(JSON.stringify(binding.workingSet)).not.toContain("packageValue")
  })

  it("accepts an initial-load transport envelope without a base revision", () => {
    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(transportEnvelopeFixture({
      baseRevision: null,
      envelopeId: "initial-load-envelope",
      purpose: "initial-load",
    }))
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      baseRevision: null,
      documentId: "caller-package",
      documentRevision: 3,
      status: "fresh",
    })
    expect(binding.status).toBe("bound")
    expect(binding.workingSet?.readModel.revision).toBe(3)
  })

  it("blocks a transport envelope that does not carry package input", () => {
    const envelope = transportEnvelopeFixture({
      envelopeId: "missing-package-envelope",
    })
    delete envelope.packageValue

    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(envelope)
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "caller-package",
      documentRevision: null,
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        code: "missing-package",
        documentId: "caller-package",
      }),
    ])
    expect(binding).toMatchObject({
      status: "blocked",
      workingSet: null,
    })
  })

  it("blocks a transport envelope with an unsupported source kind", () => {
    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(transportEnvelopeFixture({
      envelopeId: "invalid-source-envelope",
      sourceKind: "browser-core",
    }))
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "caller-package",
      documentRevision: null,
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        code: "invalid-source-kind",
        documentId: "caller-package",
      }),
    ])
    expect(binding.workingSet).toBeNull()
  })

  it("blocks a transport envelope when parsed package document id differs", () => {
    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(transportEnvelopeFixture({
      documentId: "requested-document",
      envelopeId: "document-mismatch-envelope",
      packageValue: canonicalPackageFixture("returned-document"),
    }))
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      documentId: "requested-document",
      documentRevision: 3,
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        code: "document-mismatch",
        documentId: "returned-document",
        expectedDocumentId: "requested-document",
      }),
    ])
    expect(binding.workingSet).toBeNull()
  })

  it("blocks a refresh transport envelope with a stale active base revision", () => {
    const readResult = loadReadOnlyCoreSnapshotFromEnvelope(
      transportEnvelopeFixture({
        baseRevision: 2,
        envelopeId: "stale-refresh-envelope",
      }),
      {
        documentId: "caller-package",
        documentRevision: 3,
      },
    )
    const binding = bindFrontendCoreWorkingSetFromReadResult(readResult)

    expect(readResult.envelope).toMatchObject({
      baseRevision: 2,
      documentId: "caller-package",
      documentRevision: null,
      status: "blocked",
    })
    expect(readResult.envelope.failures).toEqual([
      expect.objectContaining({
        baseRevision: 2,
        code: "revision-stale",
        documentId: "caller-package",
        sourceRevision: 3,
      }),
    ])
    expect(binding.workingSet).toBeNull()
  })

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
