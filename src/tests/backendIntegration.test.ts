import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID } from "../core/coreAdapter"
import {
  resolveFlowDocBackendBaseUrl,
  resolveFlowDocDocumentId,
} from "../editor/backend/backendConfig"
import { createBackendMutationRequestFromCommand } from "../editor/backend/backendMutationRequests"
import { runBackendMutationCommand } from "../editor/backend/backendMutationRunner"
import { createSiblingReorderPlacementPlan } from "../editor/commands/reorderPlacement"
import {
  createBackendDocumentReadResult,
  createBackendMutationReadEnvelope,
  createFlowDocBackendClient,
  type BackendMutationResultEnvelope,
} from "../editor/backend/backendTransport"
import {
  loadInitialCoreWorkingSet,
  loadFrontendCoreWorkingSetFromTransportEnvelope,
} from "../editor/coreBinding/workingSetFactory"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { getInspectorFacts } from "../editor/runtime/editorView"
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

function reorderBlockedTargetQaPackageFixture(): unknown {
  return {
    packageVersion: 2,
    kind: "document",
    id: "reorder-blocked-target-qa",
    meta: {
      title: "Reorder Blocked Target QA",
    },
    fields: {
      version: 1,
      fields: {},
    },
    data: {
      version: 1,
      values: {},
    },
    document: {
      version: 3,
      document: {
        id: "reorder-blocked-target-qa",
        meta: {
          title: "Reorder Blocked Target QA",
        },
        sections: [
          {
            id: "section-alpha",
            type: "section",
            page: {
              size: "A4",
              orientation: "portrait",
              margin: {
                top: { value: 72, unit: "pt" },
                right: { value: 72, unit: "pt" },
                bottom: { value: 72, unit: "pt" },
                left: { value: 72, unit: "pt" },
              },
            },
            zoneIds: ["zone-alpha-body"],
            nodes: {
              "zone-alpha-body": {
                id: "zone-alpha-body",
                type: "zone",
                role: "body",
                childIds: ["alpha-heading", "alpha-note"],
              },
              "alpha-heading": {
                id: "alpha-heading",
                type: "text-block",
                role: { role: "heading", level: 1 },
                props: {},
                children: [
                  {
                    id: "alpha-heading-text",
                    type: "text",
                    text: "Alpha section",
                  },
                ],
              },
              "alpha-note": {
                id: "alpha-note",
                type: "text-block",
                role: { role: "paragraph" },
                props: {},
                children: [
                  {
                    id: "alpha-note-text",
                    type: "text",
                    text: "Same-parent target.",
                  },
                ],
              },
            },
          },
          {
            id: "section-beta",
            type: "section",
            page: {
              size: "A4",
              orientation: "portrait",
              margin: {
                top: { value: 72, unit: "pt" },
                right: { value: 72, unit: "pt" },
                bottom: { value: 72, unit: "pt" },
                left: { value: 72, unit: "pt" },
              },
            },
            zoneIds: ["zone-beta-body"],
            nodes: {
              "zone-beta-body": {
                id: "zone-beta-body",
                type: "zone",
                role: "body",
                childIds: ["beta-heading", "beta-note"],
              },
              "beta-heading": {
                id: "beta-heading",
                type: "text-block",
                role: { role: "heading", level: 1 },
                props: {},
                children: [
                  {
                    id: "beta-heading-text",
                    type: "text",
                    text: "Beta section",
                  },
                ],
              },
              "beta-note": {
                id: "beta-note",
                type: "text-block",
                role: { role: "paragraph" },
                props: {},
                children: [
                  {
                    id: "beta-note-text",
                    type: "text",
                    text: "Cross-parent target.",
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

function createStateAtBackendRevision(revision: number, includeCopy = false) {
  const read = createBackendDocumentReadResult({
    documentId: "backend-document",
    packageValue: canonicalPackageFixture("backend-document", includeCopy),
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

function createProductFixtureState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    baseRevision: 3,
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    fixtureSource: "core-product-report-minimal",
  }))
}

describe("editor backend integration boundary", () => {
  it("uses the local backend URL when no environment override is configured", () => {
    expect(resolveFlowDocBackendBaseUrl(undefined)).toBe("http://127.0.0.1:4011")
    expect(resolveFlowDocBackendBaseUrl(" http://backend.test ")).toBe("http://backend.test")
    expect(resolveFlowDocDocumentId(undefined)).toBe(CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID)
    expect(resolveFlowDocDocumentId(" reorder-blocked-target-qa ")).toBe("reorder-blocked-target-qa")
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

  it("loads the reorder blocked-target QA document through the backend read boundary", () => {
    const result = createBackendDocumentReadResult({
      documentId: "reorder-blocked-target-qa",
      packageValue: reorderBlockedTargetQaPackageFixture(),
      revision: 3,
      status: "found",
      updatedAt: "2026-07-04T00:00:00.000Z",
    }, {
      receivedAt: 120,
      requestedAt: 100,
    })

    if (result.status !== "found") throw new Error("expected found backend read")
    const workingSet = loadFrontendCoreWorkingSetFromTransportEnvelope(result.envelope)
    const state = createInitialEditorStateFromWorkingSet(workingSet)

    expect(state.view.presentation.canvasSurfaceNodeIds).toEqual([
      "alpha-heading",
      "alpha-note",
      "beta-heading",
      "beta-note",
    ])
    expect(createSiblingReorderPlacementPlan(state, {
      nodeId: "alpha-heading",
      placement: "after",
      targetNodeId: "alpha-note",
    })).toMatchObject({
      status: "ready",
      targetNodeId: "alpha-note",
      toIndex: 1,
    })
    expect(createSiblingReorderPlacementPlan(state, {
      nodeId: "alpha-heading",
      placement: "after",
      targetNodeId: "beta-heading",
    })).toMatchObject({
      nodeId: "alpha-heading",
      reason: "Drag/drop reorder is limited to siblings in the same parent.",
      status: "blocked",
      targetNodeId: "beta-heading",
    })
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

  it("builds delete and reorder requests from inspector operation surfaces", () => {
    const state = createProductFixtureState()
    const deleteBuilt = createBackendMutationRequestFromCommand(state, {
      kind: "node.delete",
      reason: "inspector-delete",
      source: "inspector",
      target: {
        nodeId: "detail-cell-b-text",
      },
    }, {
      requestId: "request-delete",
      timestamp: 140,
    })
    const reorderBuilt = createBackendMutationRequestFromCommand(state, {
      kind: "node.reorder",
      payload: {
        direction: "down",
      },
      reason: "inspector-move-down",
      source: "inspector",
      target: {
        nodeId: "summary-left-text",
      },
    }, {
      requestId: "request-reorder",
      timestamp: 150,
    })

    expect(deleteBuilt).toMatchObject({
      request: {
        operation: {
          kind: "node.delete",
          nodeId: "detail-table",
        },
        requestId: "request-delete",
        source: "inspector",
      },
      status: "ready",
    })
    expect(reorderBuilt).toMatchObject({
      request: {
        operation: {
          kind: "node.reorder",
          nodeId: "summary-columns",
          toIndex: 2,
        },
        requestId: "request-reorder",
        source: "inspector",
      },
      status: "ready",
    })
  })

  it("builds keyboard reorder requests from canvas surface order", () => {
    const state = createProductFixtureState()
    const canvasOrderState = {
      ...state,
      view: {
        ...state.view,
        presentation: {
          ...state.view.presentation,
          canvasSurfaceNodeIds: ["title", "detail-table", "summary-columns"],
        },
      },
    }
    const inspectorBuilt = createBackendMutationRequestFromCommand(canvasOrderState, {
      kind: "node.reorder",
      payload: {
        direction: "down",
      },
      reason: "inspector-move-down",
      source: "inspector",
      target: {
        nodeId: "title",
      },
    }, {
      requestId: "request-inspector-reorder",
      timestamp: 155,
    })
    const keyboardBuilt = createBackendMutationRequestFromCommand(canvasOrderState, {
      kind: "node.reorder",
      payload: {
        direction: "down",
      },
      reason: "keyboard-move-down",
      source: "keyboard",
      target: {
        nodeId: "title",
      },
    }, {
      requestId: "request-keyboard-reorder",
      timestamp: 156,
    })

    expect(inspectorBuilt).toMatchObject({
      request: {
        operation: {
          kind: "node.reorder",
          nodeId: "title",
          toIndex: 1,
        },
        requestId: "request-inspector-reorder",
        source: "inspector",
      },
      status: "ready",
    })
    expect(keyboardBuilt).toMatchObject({
      request: {
        operation: {
          kind: "node.reorder",
          nodeId: "title",
          toIndex: 2,
        },
        requestId: "request-keyboard-reorder",
        source: "keyboard",
      },
      status: "ready",
    })
  })

  it("builds drag/drop reorder requests from direct toIndex placement plans", () => {
    const state = createProductFixtureState()
    const built = createBackendMutationRequestFromCommand(state, {
      kind: "node.reorder",
      payload: {
        toIndex: 0,
      },
      reason: "canvas-drop-reorder",
      source: "canvas",
      target: {
        nodeId: "detail-cell-b-text",
      },
    }, {
      requestId: "request-drag-reorder",
      timestamp: 160,
    })

    expect(built).toMatchObject({
      request: {
        operation: {
          kind: "node.reorder",
          nodeId: "detail-table",
          toIndex: 0,
        },
        requestId: "request-drag-reorder",
        source: "canvas",
      },
      status: "ready",
    })
  })

  it("exposes inspector move eligibility from sibling order", () => {
    const state = createProductFixtureState()

    expect(getInspectorFacts(state.view, "title")).toMatchObject({
      canMoveDown: true,
      canMoveUp: false,
      id: "title",
    })
    expect(getInspectorFacts(state.view, "summary-left-text")).toMatchObject({
      canMoveDown: true,
      canMoveUp: true,
      id: "summary-columns",
    })
    expect(getInspectorFacts(state.view, "detail-table")).toMatchObject({
      canMoveDown: false,
      canMoveUp: true,
      id: "detail-table",
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
      idempotency: "new",
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
      idempotency: "new",
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

  it("selects the previous surviving sibling after deleting a selected node", () => {
    const state = createStateAtBackendRevision(7, true)
    const result: BackendMutationResultEnvelope = {
      baseRevision: 7,
      core: {
        historyIntent: "structure",
      },
      documentId: "backend-document",
      idempotency: "new",
      issues: [],
      operationKind: "node.delete",
      readEnvelope: {
        baseRevision: 7,
        documentId: "backend-document",
        envelopeId: "mutation-delete:mutation-result",
        packageValue: canonicalPackageFixture("backend-document", false),
        purpose: "mutation-result",
        receivedAt: 150,
        requestedAt: 140,
        sourceKind: "mutation-result",
        sourceRevision: 8,
      },
      receivedAt: 150,
      requestId: "mutation-delete",
      requestedAt: 140,
      revision: 8,
      status: "applied",
      targetNodeIds: ["body-text-copy"],
    }

    const applied = applyRuntimeBackendMutationResult(state, result)

    expect(applied).toMatchObject({
      reason: null,
      status: "applied",
    })
    expect(applied.state.view.nodeById["body-text-copy"]).toBeUndefined()
    expect(applied.state.selection.selectedNodeId).toBe("body-text")
  })

  it("blocks old backend mutation results before replacing runtime state", () => {
    const state = createStateAtBackendRevision(8)
    const result: BackendMutationResultEnvelope = {
      baseRevision: 7,
      core: {
        historyIntent: "structure",
      },
      documentId: "backend-document",
      idempotency: "new",
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

  it("keeps canvas reorder state stable when the backend rejects the mutation", () => {
    const state = createProductFixtureState()
    const result: BackendMutationResultEnvelope = {
      baseRevision: 3,
      core: null,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      idempotency: null,
      issues: [
        {
          code: "cannot-reorder",
          message: "target cannot be reordered",
          nodeId: "summary-columns",
          path: "operation.nodeId",
          severity: "error",
        },
      ],
      operationKind: "node.reorder",
      receivedAt: 180,
      requestId: "mutation-rejected-reorder",
      requestedAt: 170,
      revision: 3,
      status: "rejected",
      targetNodeIds: ["summary-columns"],
    }

    const applied = applyRuntimeBackendMutationCommandResult(
      state,
      {
        kind: "node.reorder",
        payload: {
          toIndex: 2,
        },
        reason: "canvas-drop-reorder",
        source: "canvas",
        target: {
          nodeId: "summary-columns",
        },
      },
      result,
      {
        timestamp: 190,
      },
    )

    expect(applied.commandResult.result).toMatchObject({
      command: "node.reorder",
      reason: "cannot-reorder",
      stateChanged: false,
      status: "rejected",
    })
    expect(applied.mutationApply).toMatchObject({
      reason: "cannot-reorder",
      status: "rejected",
    })
    expect(applied.state).toBe(state)
    expect(applied.state.selection.selectedNodeId).toBe(state.selection.selectedNodeId)
    expect(applied.state.history.records).toHaveLength(0)
  })

  it("keeps canvas reorder state stable when the backend reports a stale revision", () => {
    const state = createProductFixtureState()
    const result: BackendMutationResultEnvelope = {
      baseRevision: 3,
      core: null,
      documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
      idempotency: null,
      issues: [
        {
          code: "revision-stale",
          message: "baseRevision 3 does not match current revision 4",
          path: "baseRevision",
          severity: "error",
        },
      ],
      operationKind: "node.reorder",
      receivedAt: 180,
      requestId: "mutation-stale-reorder",
      requestedAt: 170,
      revision: 4,
      status: "stale",
      targetNodeIds: ["summary-columns"],
    }

    const applied = applyRuntimeBackendMutationCommandResult(
      state,
      {
        kind: "node.reorder",
        payload: {
          toIndex: 2,
        },
        reason: "canvas-drop-reorder",
        source: "canvas",
        target: {
          nodeId: "summary-columns",
        },
      },
      result,
      {
        timestamp: 190,
      },
    )

    expect(applied.commandResult.result).toMatchObject({
      command: "node.reorder",
      reason: "revision-stale",
      stateChanged: false,
      status: "rejected",
    })
    expect(applied.mutationApply).toMatchObject({
      reason: "revision-stale",
      status: "stale",
    })
    expect(applied.state).toBe(state)
    expect(applied.state.selection.selectedNodeId).toBe(state.selection.selectedNodeId)
    expect(applied.state.history.records).toHaveLength(0)
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
            idempotency: "new" as const,
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
