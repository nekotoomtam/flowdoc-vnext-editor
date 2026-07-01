import { describe, expect, it } from "vitest"
import { loadInitialCoreSnapshot } from "../core/coreAdapter"
import {
  createFrontendCoreWorkingSetFromSnapshot,
  loadInitialCoreWorkingSet,
} from "../editor/coreBinding/workingSetFactory"

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
