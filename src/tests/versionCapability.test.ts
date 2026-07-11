import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  createBackendVersionCapabilityResult,
} from "../editor/backend/backendVersionCapability"
import {
  createBackendDocumentReadResult,
  createFlowDocBackendClient,
} from "../editor/backend/backendTransport"

function capabilityResponse(): Record<string, unknown> {
  return {
    contractVersion: 3,
    service: "flowdoc-vnext-backend",
    status: "ready",
    core: {
      active: { packageVersion: 2, documentVersion: 3 },
      migrationTarget: { packageVersion: 3, documentVersion: 4 },
    },
    backend: {
      documentRead: {
        pairs: [
          { packageVersion: 2, documentVersion: 3 },
          { packageVersion: 3, documentVersion: 4 },
        ],
        status: "available",
      },
      mutation: {
        pairs: [
          { packageVersion: 2, documentVersion: 3 },
          { packageVersion: 3, documentVersion: 4 },
        ],
        operations: [
          {
            pair: { packageVersion: 2, documentVersion: 3 },
            operationKinds: ["node.delete", "node.duplicate", "node.reorder"],
          },
          {
            pair: { packageVersion: 3, documentVersion: 4 },
            operationKinds: ["node.reorder"],
          },
        ],
        status: "available",
      },
      migrationPlan: {
        source: { packageVersion: 2, documentVersion: 3 },
        status: "core-available",
        target: { packageVersion: 3, documentVersion: 4 },
      },
      migrationPersistence: {
        baseRevisionRequired: true,
        sourceSnapshotRetention: true,
        status: "available",
      },
    },
  }
}

describe("editor version capability boundary", () => {
  it("accepts matching backend/core pairs without activating the migration target", () => {
    expect(createBackendVersionCapabilityResult(capabilityResponse())).toMatchObject({
      status: "compatible",
      envelope: {
        active: { packageVersion: 2, documentVersion: 3 },
        migrationTarget: { packageVersion: 3, documentVersion: 4 },
        migrationPersistence: "available",
        migrationBaseRevisionRequired: true,
        migrationSourceSnapshotRetention: true,
        documentReadPairs: [
          { packageVersion: 2, documentVersion: 3 },
          { packageVersion: 3, documentVersion: 4 },
        ],
        mutationPairs: [
          { packageVersion: 2, documentVersion: 3 },
          { packageVersion: 3, documentVersion: 4 },
        ],
        mutationOperations: expect.arrayContaining([
          {
            pair: { packageVersion: 3, documentVersion: 4 },
            operationKinds: ["node.reorder"],
          },
        ]),
      },
    })
  })

  it("blocks contract drift and false migration-target runtime claims", () => {
    const mismatch = capabilityResponse()
    mismatch.contractVersion = 2

    const falseRuntime = capabilityResponse()
    const backend = falseRuntime.backend as Record<string, unknown>
    const mutation = backend.mutation as { operations: Array<{ operationKinds: string[] }> }
    mutation.operations[1].operationKinds.push("node.delete")

    expect(createBackendVersionCapabilityResult(mismatch)).toMatchObject({
      status: "unsupported",
      issues: [expect.objectContaining({ code: "version-contract-mismatch" })],
    })
    expect(createBackendVersionCapabilityResult(falseRuntime)).toMatchObject({
      status: "unsupported",
      issues: [expect.objectContaining({ code: "migration-target-operation-mismatch" })],
    })
  })

  it("rejects malformed capability responses", () => {
    expect(createBackendVersionCapabilityResult({ status: "ready" })).toMatchObject({
      status: "invalid-response",
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "invalid-version-capability" }),
      ]),
    })
  })

  it("rejects migration capability responses without revision and retention facts", () => {
    const response = capabilityResponse()
    const backend = response.backend as Record<string, unknown>
    backend.migrationPersistence = { status: "not-wired" }

    expect(createBackendVersionCapabilityResult(response)).toMatchObject({
      status: "invalid-response",
      issues: expect.arrayContaining([
        expect.objectContaining({
          path: "backend.migrationPersistence.baseRevisionRequired",
        }),
        expect.objectContaining({
          path: "backend.migrationPersistence.sourceSnapshotRetention",
        }),
      ]),
    })
  })

  it("accepts migration-target packages for the read-only runtime", () => {
    expect(createBackendDocumentReadResult({
      documentId: "target-document",
      packageValue: {
        packageVersion: 3,
        document: { version: 4 },
      },
      revision: 8,
      status: "found",
      updatedAt: "2026-07-11T00:00:00.000Z",
    }, {
      receivedAt: 120,
      requestedAt: 100,
      statusCode: 200,
    })).toMatchObject({
      status: "found",
      envelope: expect.objectContaining({
        documentId: "target-document",
        sourceRevision: 8,
      }),
    })
  })

  it("fetches the backend capability endpoint through the transport client", async () => {
    const client = createFlowDocBackendClient({
      baseUrl: "http://backend.test/",
      fetchImpl: async (input) => {
        expect(input).toBe("http://backend.test/capabilities/versions")
        return {
          json: async () => capabilityResponse(),
          ok: true,
          status: 200,
        }
      },
    })

    await expect(client.readVersionCapabilities()).resolves.toMatchObject({
      status: "compatible",
      statusCode: 200,
    })
  })

  it("publishes the editor reporting boundary without direct core imports", () => {
    const doc = readFileSync(new URL("../../docs/VERSION_CAPABILITY_REPORTING.md", import.meta.url), "utf8")
    const moduleSource = readFileSync(
      new URL("../editor/backend/backendVersionCapability.ts", import.meta.url),
      "utf8",
    )

    expect(doc).toContain("## Package Read Gate")
    expect(doc).toContain("## Mutation Gate")
    expect(doc).toContain("## PASS")
    expect(moduleSource).toContain("../../core/coreAdapter")
    expect(moduleSource).not.toContain("@flowdoc/vnext-core")
  })
})
