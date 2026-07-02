import { describe, expect, it } from "vitest"
import {
  CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
  loadInitialCoreSnapshot,
} from "../core/coreAdapter"
import {
  bindFrontendCoreWorkingSetFromTransportEnvelope,
  createFrontendCoreWorkingSetFromSnapshot,
  loadFrontendCoreWorkingSetFromTransportEnvelope,
  loadInitialCoreWorkingSet,
} from "../editor/coreBinding/workingSetFactory"

function canonicalPackageFixture(documentId = "factory-envelope-document"): unknown {
  return {
    packageVersion: 2,
    kind: "document",
    id: documentId,
    meta: {
      title: "Factory Envelope Document",
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
          title: "Factory Envelope Document",
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
                    text: "Factory envelope body",
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
    : "factory-envelope-document"

  return {
    baseRevision: 3,
    documentId,
    envelopeId: "factory-envelope-1",
    packageValue: canonicalPackageFixture(documentId),
    purpose: "refresh",
    receivedAt: 120,
    requestedAt: 100,
    sourceKind: "api",
    ...overrides,
  }
}

describe("core working set factory", () => {
  it("loads a fixture-backed working set through the adapter contract", () => {
    const workingSet = loadInitialCoreWorkingSet({
      createdAt: 100,
    })

    expect(workingSet.envelope).toMatchObject({
      coreRevision: "fixture:3",
      createdAt: 100,
      documentId: "placeholder-document",
      documentRevision: 3,
      layoutGeneration: null,
      schemaVersion: 2,
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(workingSet.diagnostics).toBe(workingSet.envelope.diagnostics)
    expect(workingSet.readModel.sourceRevision).toBe(workingSet.envelope.documentRevision)
    expect(workingSet.capabilities.sourceRevision).toBe(workingSet.envelope.documentRevision)
    expect(workingSet.renderProjection).toMatchObject({
      kind: "placeholder",
      projectionId: "projection:3:placeholder",
      sourceRevision: workingSet.envelope.documentRevision,
    })
  })

  it("can omit render projection summary for future lazy loading", () => {
    const workingSet = loadInitialCoreWorkingSet({
      createdAt: 100,
      includeRenderProjection: false,
    })

    expect(workingSet.renderProjection).toBeNull()
    expect(workingSet.readModel.nodeOrder).toContain("qa-scroll")
  })

  it("binds a transport envelope through the working set factory boundary", () => {
    const binding = bindFrontendCoreWorkingSetFromTransportEnvelope(
      transportEnvelopeFixture(),
      {
        documentId: "factory-envelope-document",
        documentRevision: 3,
      },
    )

    expect(binding.status).toBe("bound")
    expect(binding.readResult.envelope).toMatchObject({
      coreRevision: "api:factory-envelope-document:3",
      documentId: "factory-envelope-document",
      documentRevision: 3,
      failures: [],
      sourceKind: "api",
      status: "fresh",
    })
    expect(binding.workingSet?.document).toMatchObject({
      id: "factory-envelope-document",
      title: "Factory Envelope Document",
    })
    expect(binding.workingSet?.readModel.nodeById["body-text"]).toMatchObject({
      label: "Factory envelope body",
      parentId: "zone-body",
    })
    expect(binding.workingSet).not.toHaveProperty("packageValue")
  })

  it("loads a working set from a valid transport envelope convenience path", () => {
    const workingSet = loadFrontendCoreWorkingSetFromTransportEnvelope(
      transportEnvelopeFixture(),
      {
        active: {
          documentId: "factory-envelope-document",
          documentRevision: 3,
        },
      },
    )

    expect(workingSet.envelope).toMatchObject({
      documentId: "factory-envelope-document",
      sourceKind: "api",
      status: "fresh",
    })
    expect(workingSet.renderProjection?.documentId).toBe("factory-envelope-document")
  })

  it("returns a blocked binding for invalid transport envelopes", () => {
    const envelope = transportEnvelopeFixture({
      envelopeId: "factory-missing-package",
    })
    delete envelope.packageValue
    const binding = bindFrontendCoreWorkingSetFromTransportEnvelope(envelope)

    expect(binding).toMatchObject({
      status: "blocked",
      workingSet: null,
    })
    expect(binding.failures).toEqual([
      expect.objectContaining({
        code: "missing-package",
        documentId: "factory-envelope-document",
      }),
    ])
  })

  it("throws from the convenience loader when the transport envelope is blocked", () => {
    const envelope = transportEnvelopeFixture({
      sourceKind: "browser-core",
    })

    expect(() => loadFrontendCoreWorkingSetFromTransportEnvelope(envelope)).toThrow(
      "Core working set is blocked by the read-only transport envelope.",
    )
  })

  it("blocks stale transport envelopes before working set creation", () => {
    const binding = bindFrontendCoreWorkingSetFromTransportEnvelope(
      transportEnvelopeFixture({
        baseRevision: 2,
      }),
      {
        documentId: "factory-envelope-document",
        documentRevision: 3,
      },
    )

    expect(binding).toMatchObject({
      status: "blocked",
      workingSet: null,
    })
    expect(binding.failures).toEqual([
      expect.objectContaining({
        baseRevision: 2,
        code: "revision-stale",
        sourceRevision: 3,
      }),
    ])
  })

  it("loads the public core fixture through the initial working set loader", () => {
    const workingSet = loadInitialCoreWorkingSet({
      baseRevision: 3,
      createdAt: 100,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      fixtureSource: "core-product-report-minimal",
    })

    expect(workingSet.envelope).toMatchObject({
      coreRevision: "fixture:3",
      createdAt: 100,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      documentRevision: 3,
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(workingSet.document.title).toBe("Product Report vNext Minimal")
    expect(workingSet.readModel.nodeById.title).toMatchObject({
      label: "Product Report for Customer",
    })
  })

  it("keeps working set read data isolated from later adapter snapshot mutation", () => {
    const snapshot = loadInitialCoreSnapshot({
      createdAt: 100,
    })
    const workingSet = createFrontendCoreWorkingSetFromSnapshot(snapshot)
    const snapshotNode = snapshot.seed.nodes.find((node) => node.id === "qa-scroll")

    if (!snapshotNode) throw new Error("qa-scroll fixture node is missing")
    snapshot.seed.diagnostics.keyDataStatus = "mutated"
    snapshot.seed.document.title = "Mutated snapshot title"
    snapshotNode.label = "mutated snapshot label"
    snapshotNode.childIds.push("mutated-child")

    expect(workingSet.envelope.documentId).toBe("placeholder-document")
    expect(workingSet.diagnostics.keyDataStatus).toBe("unknown")
    expect(workingSet.readModel.nodeById["qa-scroll"]?.label).toContain("Scroll should remain")
    expect(workingSet.readModel.childrenById["qa-scroll"]).toEqual([])
  })

  it("preserves adapter snapshot status and source metadata", () => {
    const snapshot = {
      ...loadInitialCoreSnapshot({
        createdAt: 100,
      }),
      coreRevision: "api:document-4",
      snapshotRevision: 4,
      sourceKind: "api" as const,
      status: "partial" as const,
    }
    const workingSet = createFrontendCoreWorkingSetFromSnapshot(snapshot, {
      renderProjectionKind: "live",
    })

    expect(workingSet.envelope).toMatchObject({
      coreRevision: "api:document-4",
      snapshotRevision: 4,
      sourceKind: "api",
      status: "partial",
    })
    expect(workingSet.renderProjection).toMatchObject({
      kind: "live",
      sourceRevision: workingSet.envelope.documentRevision,
    })
  })
})
