import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import evidence from "../fixtures/live-draft-mr1-multi-block-scheduling.v1.json"

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
}

describe("MR1 multi-block scheduling evidence", () => {
  it("accepts page creation/removal, exact reconvergence, latest-only scheduling, and a warm frame budget", () => {
    expect(evidence.status).toBe("accepted-bounded-multi-block-scheduling")
    expect(evidence.execution).toMatchObject({
      realChromeWorkerWasm: true,
      initializedWorkerReused: true,
      textBlockCount: 12,
      activeAndVisibleFirst: true,
      coreFixedPointDocumentComposition: true,
      coreDocumentDisplayListProjection: true,
      realChromeAtomicCanvasPaint: true,
      backendRequestCount: 0,
      productBinding: false,
      productionBinding: false,
    })
    expect(evidence.outcome).toMatchObject({
      initialPageCount: 2,
      expandedPageCount: 3,
      contractedPageCount: 2,
      pageCreationAccepted: true,
      pageRemovalAccepted: true,
      incrementalReuseAccepted: true,
      staleCompletionRevision: 4,
      coalescedBeforeDispatchRevision: 5,
      sameGeometryWork: {
        firstDirtyBlockIndex: 5,
        reusedPrefixBlockCount: 5,
        recomposedBlockCount: 1,
        recomposedLineCount: 1,
        reusedSuffixBlockCount: 6,
        reconvergedAtBlockIndex: 6,
      },
      sameGeometryProjectionWork: {
        reusedLineCount: 11,
        projectedLineCount: 1,
        validatedLayoutCount: 1,
      },
    })
    expect(evidence.outcome.initialRequestOrder[0]).toBe("text-block-05-active")
    expect(evidence.outcome.paintedRevisions).not.toContain(4)
    expect(evidence.outcome.paintedRevisions).not.toContain(5)
    expect(evidence.outcome.finalMetrics).toMatchObject({
      staleResultCount: 1,
      coalescedCount: 1,
      failedCount: 0,
    })
    expect(evidence.timing.frameBudgetAccepted).toBe(true)
    expect(evidence.timing.warmMainThread.sampleCount).toBe(10)
    expect(evidence.timing.warmMainThread.p95Ms).toBeLessThanOrEqual(evidence.timing.mainThreadFrameBudgetMs)
    expect(evidence.outcome.finalNonWhitePixelCount).toBeGreaterThan(1_000)
  })

  it("keeps token impact advisory, Core access behind the adapter, and Canvas painting atomic", () => {
    const impact = read("src/editor/liveDraft/liveDraftMultiBlockImpact.ts")
    const controller = read("src/editor/liveDraft/liveDraftMultiBlockController.ts")
    const painter = read("src/editor/liveDraft/liveDraftMultiBlockCanvasPainter.ts")
    const adapter = read("src/core/coreAdapter.ts")

    expect(impact).toContain('purpose: "scheduling-and-invalidation-hint"')
    expect(impact).toContain("lineBreakAuthority: false")
    expect(impact).toContain("geometryAuthority: false")
    expect(controller).toContain("composeCoreLiveDraftMultiBlockDocumentV1")
    expect(controller).toContain("projectCoreLiveDraftMultiBlockDisplayListV1")
    expect(controller).not.toMatch(/@flowdoc\/vnext-core/u)
    expect(adapter).toContain("composeVNextTextBlockMultiRunDocumentV1")
    expect(adapter).toContain("projectVNextTextBlockMultiRunDocumentDisplayListV1")
    expect(painter).toContain("drawImage(scratch, 0, 0)")
    expect(painter).not.toMatch(/measureText|\.width\s*=\s*context\.measureText/u)
    expect(evidence.contracts).toMatchObject({
      coreOwnsPagination: true,
      canvasAtomicSwap: true,
      rendererMeasuredText: false,
      rendererRelayout: false,
      rendererPaginated: false,
      backendBinding: false,
      productBinding: false,
      tableScope: false,
    })
  })
})
