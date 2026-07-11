import { describe, expect, it } from "vitest"
import imageTargetFixture from "@flowdoc/vnext-core/fixtures/product-report-v4-image-target.flowdoc.json"
import migratedFixture from "@flowdoc/vnext-core/fixtures/product-report-v4-migrated-minimal.flowdoc.json"
import { loadReadOnlyCoreSnapshotFromPackage } from "../core/coreAdapter"
import { bindFrontendCoreWorkingSetFromReadResult } from "../editor/coreBinding/workingSetFactory"
import { projectRenderNodes } from "../editor/render/renderProjector"

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
      runtimeMode: "read-only",
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
      && !capability.deletable
      && !capability.duplicable
      && !capability.editable
      && !capability.reorderable
    ))).toBe(true)
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
})
