import { describe, expect, it } from "vitest"
import imageTargetFixture from "@flowdoc/vnext-core/fixtures/product-report-v4-image-target.flowdoc.json"
import migratedFixture from "@flowdoc/vnext-core/fixtures/product-report-v4-migrated-minimal.flowdoc.json"
import { loadReadOnlyCoreSnapshotFromPackage } from "../core/coreAdapter"
import { bindFrontendCoreWorkingSetFromReadResult } from "../editor/coreBinding/workingSetFactory"
import { projectRenderNodes } from "../editor/render/renderProjector"
import { createBackendMutationRequestFromCommand } from "../editor/backend/backendMutationRequests"
import type { BackendMutationResultEnvelope } from "../editor/backend/backendTransport"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { applyRuntimeBackendMutationCommandResult } from "../editor/runtime/runtimeBackendMutationCommand"

function bindFixture(packageValue: unknown, documentId: string) {
  return bindFrontendCoreWorkingSetFromReadResult(loadReadOnlyCoreSnapshotFromPackage(packageValue, {
    baseRevision: 8,
    createdAt: 100,
    documentId,
    sourceKind: "api",
    sourceRevision: 8,
  }))
}

describe("document v4 read-only editor runtime", () => {
  it("binds migrated v4 content while locking editing, mutation, and layout commands", () => {
    const binding = bindFixture(migratedFixture, "product-report-vnext-minimal")

    expect(binding.status).toBe("bound")
    const workingSet = binding.workingSet
    if (!workingSet) throw new Error("v4 fixture did not bind")

    expect(workingSet.document).toMatchObject({
      packageVersion: 3,
      documentVersion: 4,
      runtimeMode: "partial",
    })
    expect(workingSet.readModel.presentation.canvasSurfaceNodeIds).toEqual([
      "title",
      "summary-columns",
      "detail-table",
    ])
    expect(workingSet.capabilities.global).toEqual({
      canCommitMutation: false,
      canOpenTextDraft: false,
      canRequestExactLayout: false,
      canRequestLiveLayout: false,
    })
    expect(Object.values(workingSet.capabilities.byNodeId).every((capability) => (
      !capability.canInsertFieldChip
      && !capability.canOpenTextDraft
      && !capability.duplicable
      && !capability.editable
    ))).toBe(true)
    expect(workingSet.capabilities.byNodeId.title.deletable).toBe(true)
    expect(workingSet.capabilities.byNodeId["detail-header-row"].deletable).toBe(false)
    expect(workingSet.capabilities.byNodeId.title.reorderable).toBe(true)
    expect(workingSet.capabilities.byNodeId["detail-header-row"].reorderable).toBe(false)
  })

  it("projects block and inline images as structural read-only placeholders", () => {
    const binding = bindFixture(imageTargetFixture, "product-report-v4-image-target")
    const workingSet = binding.workingSet
    if (!workingSet) throw new Error("v4 image fixture did not bind")

    expect(workingSet.readModel.nodeById["body-text"].label).toContain("[Image]")
    expect(workingSet.readModel.presentation.presentationNodeById["body-image"]).toMatchObject({
      role: "surface",
      surfaceType: "image",
    })
    expect(projectRenderNodes(workingSet.readModel)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "body-image",
        label: "Image",
        renderKind: "image",
      }),
    ]))
  })

  it("enables only same-parent reorder and applies a v4 mutation envelope", () => {
    const initialBinding = bindFixture(migratedFixture, "product-report-vnext-minimal")
    if (!initialBinding.workingSet) throw new Error("v4 fixture did not bind")
    const state = createInitialEditorStateFromWorkingSet(initialBinding.workingSet)
    const command = {
      kind: "node.reorder" as const,
      payload: { toIndex: 2 },
      reason: "canvas-drop-reorder",
      source: "canvas" as const,
      target: { nodeId: "title" },
    }
    expect(createBackendMutationRequestFromCommand(state, command, {
      requestId: "v4-reorder",
    })).toMatchObject({
      status: "ready",
      request: {
        baseRevision: 8,
        operation: { kind: "node.reorder", nodeId: "title", toIndex: 2 },
      },
    })
    expect(createBackendMutationRequestFromCommand(state, {
      kind: "node.delete",
      reason: "inspector-delete",
      source: "inspector",
      target: { nodeId: "title" },
    })).toMatchObject({ status: "ready" })
    expect(createBackendMutationRequestFromCommand(state, {
      kind: "node.duplicate",
      reason: "inspector-duplicate",
      source: "inspector",
      target: { nodeId: "title" },
    })).toMatchObject({ status: "blocked" })

    const reorderedPackage = structuredClone(migratedFixture)
    const section = reorderedPackage.document.document.sections[0]
    const zone = section.nodes["zone-cover-body"]
    if (zone.type !== "zone") throw new Error("expected body zone")
    zone.childIds = ["summary-columns", "detail-table", "title"]
    const result: BackendMutationResultEnvelope = {
      baseRevision: 8,
      core: { historyIntent: "structure", renderInvalidation: null },
      documentId: "product-report-vnext-minimal",
      issues: [],
      operationKind: "node.reorder",
      readEnvelope: {
        baseRevision: 8,
        documentId: "product-report-vnext-minimal",
        envelopeId: "v4-reorder:mutation-result",
        packageValue: reorderedPackage,
        purpose: "mutation-result",
        receivedAt: 160,
        requestedAt: 150,
        sourceKind: "mutation-result",
        sourceRevision: 9,
      },
      receivedAt: 160,
      requestId: "v4-reorder",
      requestedAt: 150,
      revision: 9,
      status: "applied",
      targetNodeIds: ["title"],
    }
    const applied = applyRuntimeBackendMutationCommandResult(state, command, result)

    expect(applied.commandResult.result.status).toBe("applied")
    expect(applied.state.seed.document.runtimeMode).toBe("partial")
    expect(applied.state.view.presentation.canvasSurfaceNodeIds).toEqual([
      "summary-columns", "detail-table", "title",
    ])
    expect(applied.state.core.envelope.documentRevision).toBe(9)
  })
})
