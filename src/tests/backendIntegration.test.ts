import { describe, expect, it } from "vitest"
import { resolveFlowDocBackendBaseUrl } from "../editor/backend/backendConfig"
import { createBackendMutationRequestFromCommand } from "../editor/backend/backendMutationRequests"
import { runBackendMutationCommand } from "../editor/backend/backendMutationRunner"
import {
  createBackendDocumentReadResult,
  createBackendMutationReadEnvelope,
  createFlowDocBackendClient,
  type BackendMutationResultEnvelope,
} from "../editor/backend/backendTransport"
import { loadFrontendCoreWorkingSetFromTransportEnvelope } from "../editor/coreBinding/workingSetFactory"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { applyRuntimeBackendMutationResult } from "../editor/runtime/runtimeBackendMutation"
import { applyRuntimeBackendMutationCommandResult } from "../editor/runtime/runtimeBackendMutationCommand"

function canonicalPackageFixture(documentId = "backend-document", includeCopy = false): unknown {
  return {
    packageVersion: 2,
    kind: "document",
    id: documentId,
    meta: {
      title: "Backend Document",
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
          title: "Backend Document",
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
                childIds: includeCopy ? ["body-text", "body-text-copy"] : ["body-text"],
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
                    text: "Backend body",
                  },
                ],
              },
              ...(includeCopy
                ? {
                    "body-text-copy": {
                      id: "body-text-copy",
                      type: "text-block",
                      role: { role: "paragraph" },
                      props: {},
                      children: [
                        {
                          id: "body-run-copy",
                          type: "text",
                          text: "Backend body copy",
                        },
                      ],
                    },
                  }
                : {}),
            },
          },
        ],
      },
    },
  }
}

function createStateAtBackendRevision(revision: number) {
  const read = createBackendDocumentReadResult({
    documentId: "backend-document",
    packageValue: canonicalPackageFixture(),
    revision,
    status: "found",
    updatedAt: "2026-07-04T00:00:00.000Z",
  }, {
    receivedAt: 120,
    requestedAt: 100,
  })

  if (read.status !== "found") throw new Error("test backend read fixture is invalid")

  return createInitialEditorStateFromWorkingSet(
    loadFrontendCoreWorkingSetFromTransportEnvelope(read.envelope),
  )
}

describe("editor backend integration boundary", () => {
  it("uses the local backend URL when no environment override is configured", () => {
    expect(resolveFlowDocBackendBaseUrl(undefined)).toBe("http://127.0.0.1:4011")
    expect(resolveFlowDocBackendBaseUrl(" http://backend.test ")).toBe("http://backend.test")
  })

  it("turns backend read responses into source-revisioned core transport envelopes", () => {
    const result = createBackendDocumentReadResult({
      documentId: "backend-document",
      packageValue: canonicalPackageFixture(),
      revision: 7,
      status: "found",
      updatedAt: "2026-07-04T00:00:00.000Z",
    }, {
      receivedAt: 120,
      requestedAt: 100,
    })

    expect(result).toMatchObject({
      envelope: {
        baseRevision: 7,
        documentId: "backend-document",
        purpose: "initial-load",
        sourceKind: "api",
        sourceRevision: 7,
      },
      status: "found",
    })

    if (result.status !== "found") throw new Error("expected found backend read")
    const workingSet = loadFrontendCoreWorkingSetFromTransportEnvelope(result.envelope)
    expect(workingSet.envelope).toMatchObject({
      documentRevision: 7,
      documentVersion: 3,
      snapshotRevision: 7,
      sourceKind: "api",
    })
    expect(workingSet.readModel.sourceRevision).toBe(7)
  })

  it("builds backend mutation requests from editor commands and active revision", () => {
    const state = createStateAtBackendRevision(7)
    const built = createBackendMutationRequestFromCommand(state, {
      kind: "node.duplicate",
      reason: "inspector-duplicate",
      source: "inspector",
      target: {
        nodeId: "body-text",
      },
    }, {
      requestId: "request-1",
      timestamp: 130,
    })

    expect(built).toMatchObject({
      request: {
        baseRevision: 7,
        documentId: "backend-document",
        operation: {
          kind: "node.duplicate",
          nodeId: "body-text",
        },
        requestId: "request-1",
        source: "inspector",
      },
      status: "ready",
    })
  })

  it("applies fresh backend mutation results through the runtime revision gate", () => {
    const state = createStateAtBackendRevision(7)
    const result: BackendMutationResultEnvelope = {
      baseRevision: 7,
      core: {
        historyIntent: "structure",
      },
      documentId: "backend-document",
      issues: [],
      operationKind: "node.duplicate",
      readEnvelope: {
        baseRevision: 7,
        documentId: "backend-document",
        envelopeId: "mutation-1:mutation-result",
        packageValue: canonicalPackageFixture("backend-document", true),
        purpose: "mutation-result",
        receivedAt: 150,
        requestedAt: 140,
        sourceKind: "mutation-result",
        sourceRevision: 8,
      },
      receivedAt: 150,
      requestId: "mutation-1",
      requestedAt: 140,
      revision: 8,
      status: "applied",
      targetNodeIds: ["body-text", "body-text-copy"],
    }

    expect(createBackendMutationReadEnvelope(result)).toMatchObject({
      baseRevision: 7,
      sourceKind: "mutation-result",
      sourceRevision: 8,
    })

    const applied = applyRuntimeBackendMutationResult(state, result)

    expect(applied).toMatchObject({
      reason: null,
      status: "applied",
    })
    expect(applied.state.core.envelope).toMatchObject({
      documentRevision: 8,
      documentVersion: 3,
      sourceKind: "mutation-result",
    })
    expect(applied.state.view.nodeById["body-text-copy"]).toMatchObject({
      id: "body-text-copy",
      type: "text-block",
    })
    expect(applied.state.selection.selectedNodeId).toBe("body-text-copy")
  })

  it("records history when a backend mutation command applies", () => {
    const state = createStateAtBackendRevision(7)
    const result: BackendMutationResultEnvelope = {
      baseRevision: 7,
      core: {
        historyIntent: "structure",
      },
      documentId: "backend-document",
      issues: [],
      operationKind: "node.duplicate",
      readEnvelope: {
        baseRevision: 7,
        documentId: "backend-document",
        envelopeId: "mutation-history:mutation-result",
        packageValue: canonicalPackageFixture("backend-document", true),
        purpose: "mutation-result",
        receivedAt: 150,
        requestedAt: 140,
        sourceKind: "mutation-result",
        sourceRevision: 8,
      },
      receivedAt: 150,
      requestId: "mutation-history",
      requestedAt: 140,
      revision: 8,
      status: "applied",
      targetNodeIds: ["body-text", "body-text-copy"],
    }

    const applied = applyRuntimeBackendMutationCommandResult(
      state,
      {
        kind: "node.duplicate",
        reason: "inspector-duplicate",
        source: "inspector",
        target: {
          nodeId: "body-text",
        },
      },
      result,
      {
        timestamp: 160,
      },
    )

    expect(applied.commandResult.result).toMatchObject({
      changed: ["core", "selection"],
      command: "node.duplicate",
      status: "applied",
    })
    expect(applied.state.history.records).toHaveLength(1)
    expect(applied.state.history.records[0]).toMatchObject({
      changed: ["core", "selection"],
      documentRevisionAfter: 8,
      documentRevisionBefore: 7,
      kind: "structuralCommand",
      payloadSummary: "body-text",
      source: "inspector",
      sourceCommand: "node.duplicate",
    })
  })

  it("blocks old backend mutation results before replacing runtime state", () => {
    const state = createStateAtBackendRevision(8)
    const result: BackendMutationResultEnvelope = {
      baseRevision: 7,
      core: {
        historyIntent: "structure",
      },
      documentId: "backend-document",
      issues: [],
      operationKind: "node.duplicate",
      readEnvelope: {
        baseRevision: 7,
        documentId: "backend-document",
        envelopeId: "mutation-old:mutation-result",
        packageValue: canonicalPackageFixture("backend-document", true),
        purpose: "mutation-result",
        receivedAt: 150,
        requestedAt: 140,
        sourceKind: "mutation-result",
        sourceRevision: 8,
      },
      receivedAt: 150,
      requestId: "mutation-old",
      requestedAt: 140,
      revision: 8,
      status: "applied",
      targetNodeIds: ["body-text", "body-text-copy"],
    }

    const applied = applyRuntimeBackendMutationResult(state, result)

    expect(applied).toMatchObject({
      reason: "base-revision-mismatch",
      status: "blocked-stale",
    })
    expect(applied.state).toBe(state)
  })

  it("fetches backend reads through the client without exposing transport in components", async () => {
    const client = createFlowDocBackendClient({
      baseUrl: "http://backend.test/",
      fetchImpl: async (input) => {
        expect(input).toBe("http://backend.test/documents/backend-document")
        return {
          json: async () => ({
            documentId: "backend-document",
            packageValue: canonicalPackageFixture(),
            revision: 7,
            status: "found",
            updatedAt: "2026-07-04T00:00:00.000Z",
          }),
          ok: true,
          status: 200,
        }
      },
      now: (() => {
        const times = [100, 120]
        return () => times.shift() ?? 120
      })(),
    })

    await expect(client.readDocument("backend-document")).resolves.toMatchObject({
      envelope: {
        receivedAt: 120,
        requestedAt: 100,
        sourceRevision: 7,
      },
      status: "found",
    })
  })

  it("runs a backend mutation command through request, client, and runtime apply boundaries", async () => {
    const state = createStateAtBackendRevision(7)
    const run = await runBackendMutationCommand(
      state,
      {
        kind: "node.duplicate",
        reason: "toolbar-duplicate",
        source: "toolbar",
        target: {
          nodeId: "body-text",
        },
      },
      {
        async commitMutation(request) {
          expect(request).toMatchObject({
            baseRevision: 7,
            operation: {
              kind: "node.duplicate",
              nodeId: "body-text",
            },
            requestId: "request-2",
          })

          return {
            baseRevision: request.baseRevision,
            core: {
              historyIntent: "structure",
            },
            documentId: request.documentId,
            issues: [],
            operationKind: request.operation.kind,
            readEnvelope: {
              baseRevision: request.baseRevision,
              documentId: request.documentId,
              envelopeId: "request-2:mutation-result",
              packageValue: canonicalPackageFixture(request.documentId, true),
              purpose: "mutation-result",
              receivedAt: 150,
              requestedAt: 140,
              sourceKind: "mutation-result",
              sourceRevision: 8,
            },
            receivedAt: 150,
            requestId: request.requestId,
            requestedAt: 140,
            revision: 8,
            status: "applied",
            targetNodeIds: ["body-text", "body-text-copy"],
          }
        },
      },
      {
        requestId: "request-2",
        timestamp: 140,
      },
    )

    expect(run).toMatchObject({
      apply: {
        status: "applied",
      },
      request: {
        requestId: "request-2",
      },
      status: "completed",
    })
    if (run.status !== "completed") throw new Error("expected completed mutation run")
    expect(run.apply.state.core.envelope.documentRevision).toBe(8)
    expect(run.apply.state.selection.selectedNodeId).toBe("body-text-copy")
  })
})
