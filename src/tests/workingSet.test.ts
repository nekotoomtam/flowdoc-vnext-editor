import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { createCommandCapabilityMirror } from "../editor/coreBinding/capabilityMirror"
import { createCoreSnapshotEnvelope } from "../editor/coreBinding/coreEnvelope"
import { createEditorReadModel } from "../editor/coreBinding/readModel"
import { createRenderProjectionCache } from "../editor/coreBinding/renderProjectionCache"
import { isCoreDerivedCacheStale } from "../editor/coreBinding/revisionGuards"
import { projectRenderDocument } from "../editor/render/renderProjector"

describe("frontend core working set definitions", () => {
  it("creates a revisioned core snapshot envelope from adapter-safe seed data", () => {
    const seed = loadInitialEditorSeed()
    const envelope = createCoreSnapshotEnvelope(seed)

    expect(envelope).toMatchObject({
      coreRevision: "fixture:3",
      documentId: "placeholder-document",
      documentRevision: 3,
      documentVersion: 3,
      packageVersion: 2,
      schemaVersion: 2,
      snapshotRevision: 3,
      source: "fixture",
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

    expect(readModel.revision).toBe(seed.document.documentVersion)
    expect(readModel.nodeById["qa-scroll"]?.label).toContain("Scroll should remain")
    expect(readModel.parentById["qa-scroll"]).toBe("zone-main")
    expect(capabilities.revision).toBe(readModel.revision)
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

  it("creates render projection cache with node maps and stale guards", () => {
    const seed = loadInitialEditorSeed()
    const envelope = createCoreSnapshotEnvelope(seed)
    const readModel = createEditorReadModel(seed)
    const projection = projectRenderDocument(readModel)
    const cache = createRenderProjectionCache(projection, {
      sourceRevision: envelope.documentRevision,
    })
    const olderEnvelope = createCoreSnapshotEnvelope(seed, {
      coreRevision: "fixture:4",
      snapshotRevision: 4,
    })
    const staleEnvelope = createCoreSnapshotEnvelope(seed, {
      status: "stale",
    })

    expect(cache).toMatchObject({
      kind: "placeholder",
      projectionId: "projection:3:placeholder",
      sourceRevision: 3,
      stale: false,
    })
    expect(cache.pages.length).toBeGreaterThan(1)
    expect(cache.nodeToBlocks["qa-scroll"]).toEqual(["preview-page-4:block:qa-scroll"])
    expect(cache.nodeToFragments["qa-scroll"]).toEqual(["preview-page-4:fragment:qa-scroll"])
    expect(isCoreDerivedCacheStale(cache, envelope)).toBe(false)
    expect(isCoreDerivedCacheStale(cache, {
      ...olderEnvelope,
      documentRevision: 4,
    })).toBe(true)
    expect(isCoreDerivedCacheStale(cache, staleEnvelope)).toBe(true)
  })
})
