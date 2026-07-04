import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { createCommandCapabilityMirror } from "../editor/coreBinding/capabilityMirror"
import { createCoreSnapshotEnvelope } from "../editor/coreBinding/coreEnvelope"
import { createEditorReadModel } from "../editor/coreBinding/readModel"
import { createRenderProjectionSummary } from "../editor/coreBinding/renderProjectionSummary"
import {
  canApplyCoreDerivedResult,
  getCoreDerivedStaleReason,
  isCoreDerivedCacheStale,
} from "../editor/coreBinding/revisionGuards"
import { projectRenderDocument } from "../editor/render/renderProjector"

describe("frontend core working set definitions", () => {
  it("creates a revisioned core snapshot envelope from adapter-safe seed data", () => {
    const seed = loadInitialEditorSeed()
    const envelope = createCoreSnapshotEnvelope(seed, {
      createdAt: 100,
    })

    expect(envelope).toMatchObject({
      coreRevision: "fixture:3",
      createdAt: 100,
      documentId: "placeholder-document",
      documentRevision: 3,
      documentVersion: 3,
      packageVersion: 2,
      schemaVersion: 2,
      snapshotRevision: 3,
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(envelope.capabilities).toMatchObject({
      canCommitMutations: false,
      canParsePackage: true,
      canRequestLiveLayout: true,
      canRunBrowserSafeOperations: false,
    })
  })

  it("builds a normalized read model and capability mirror as revisioned cache", () => {
    const seed = loadInitialEditorSeed()
    const readModel = createEditorReadModel(seed)
    const capabilities = createCommandCapabilityMirror(readModel)
    const seedNode = seed.nodes.find((node) => node.id === "qa-scroll")

    expect(readModel.revision).toBe(seed.document.documentVersion)
    expect(readModel.sourceRevision).toBe(seed.document.documentVersion)
    expect(readModel.nodeById["qa-scroll"]?.label).toContain("Scroll should remain")
    expect(readModel.nodeById["qa-scroll"]).not.toBe(seedNode)
    expect(readModel.parentById["qa-scroll"]).toBe("zone-main")
    expect(readModel.childrenById["zone-main"]).toContain("qa-scroll")
    expect(readModel.childrenById["zone-main"]).toEqual(
      seed.nodes.find((node) => node.id === "zone-main")?.childIds,
    )
    expect(capabilities.revision).toBe(readModel.revision)
    expect(capabilities.sourceRevision).toBe(readModel.sourceRevision)
    expect(capabilities.byNodeId["qa-scroll"]).toMatchObject({
      canOpenTextDraft: true,
      editable: true,
      selectable: true,
    })
    expect(capabilities.byNodeId["zone-main"]).toMatchObject({
      canOpenTextDraft: false,
      editable: false,
      selectable: true,
    })
  })

  it("keeps read model objects isolated from later seed object mutation", () => {
    const seed = loadInitialEditorSeed()
    const readModel = createEditorReadModel(seed)
    const seedNode = seed.nodes.find((node) => node.id === "qa-scroll")

    if (!seedNode) throw new Error("qa-scroll fixture node is missing")
    seedNode.label = "mutated after read model build"
    seedNode.childIds.push("mutated-child")

    expect(readModel.nodeById["qa-scroll"]?.label).toContain("Scroll should remain")
    expect(readModel.childrenById["qa-scroll"]).toEqual([])
  })

  it("creates render projection summary with node maps and stale guards", () => {
    const seed = loadInitialEditorSeed()
    const envelope = createCoreSnapshotEnvelope(seed, {
      createdAt: 100,
    })
    const readModel = createEditorReadModel(seed)
    const projection = projectRenderDocument(readModel)
    const qaScrollPage = projection.pages.find((page) => page.nodeIds.includes("qa-scroll"))
    const summary = createRenderProjectionSummary(projection, {
      documentId: envelope.documentId,
      sourceRevision: envelope.documentRevision,
    })

    if (!qaScrollPage) throw new Error("qa-scroll should be projected onto a preview page")
    const olderEnvelope = createCoreSnapshotEnvelope(seed, {
      createdAt: 200,
      coreRevision: "fixture:4",
      snapshotRevision: 4,
    })
    const staleEnvelope = createCoreSnapshotEnvelope(seed, {
      createdAt: 300,
      status: "stale",
    })

    expect(summary).toMatchObject({
      blockCount: readModel.renderableNodeIds.length,
      kind: "placeholder",
      pageCount: projection.pages.length,
      projectionId: "projection:3:placeholder",
      sourceRevision: 3,
      stale: false,
    })
    expect("pages" in summary).toBe(false)
    expect(summary.pageCount).toBeGreaterThan(1)
    expect(summary.nodeToBlockIds["qa-scroll"]).toEqual([`${qaScrollPage.id}:block:qa-scroll`])
    expect(summary.nodeToFragmentIds["qa-scroll"]).toEqual([`${qaScrollPage.id}:fragment:qa-scroll`])
    expect(isCoreDerivedCacheStale(summary, envelope)).toBe(false)
    expect(canApplyCoreDerivedResult(summary, envelope)).toBe(true)
    expect(getCoreDerivedStaleReason(summary, {
      ...olderEnvelope,
      documentRevision: 4,
    })).toBe("revision-mismatch")
    expect(isCoreDerivedCacheStale(summary, staleEnvelope)).toBe(true)
    expect(getCoreDerivedStaleReason({
      ...summary,
      stale: true,
    }, envelope)).toBe("cache-stale")
  })
})
