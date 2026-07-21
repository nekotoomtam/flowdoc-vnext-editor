import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import evidence from "../fixtures/live-draft-mr1-contextual-range-facts.v1.json"

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
}

describe("MR1 contextual range evidence", () => {
  it("retains six exact contextual-shape and bounded-segmentation oracle proofs", () => {
    expect(evidence.status).toBe("accepted-oracle-proved-range-facts")
    expect(evidence.execution).toEqual({
      realChromeWorkerWasm: true,
      fullOracleExecuted: true,
      contextualRangeShapingExecuted: true,
      boundedRangeSegmentationExecuted: true,
      scenarioCount: 6,
      warmSamplesPerScenario: 10,
      backendRequestCount: 0,
      rangeFactsMayPublishWithoutOracle: false,
      productBinding: false,
      productionBinding: false,
    })
    expect(evidence.identity).toMatchObject({
      runtime: "browser-worker-wasm-mr1-range",
      wasmSha256: "90bbb751ad3d5613175d689a2b07f95320b856a5e9420118b259d5738b7dabe7",
      boundaryVersion: "flowdoc-text-engine-wasm-live-draft-mr1-range-v1",
      importsWasm: true,
      executesRustybuzz: true,
      executesIcu4x: true,
      productionBinding: false,
    })
    expect(evidence.baseline).toEqual({ fullTextUtf16Length: 4_959, fullTextScalarCount: 4_959 })
    expect(evidence.outcome).toMatchObject({ shapeExact: true, segmentationExact: true, workBounded: true })
    expect(evidence.outcome.scenarios).toHaveLength(6)
    expect(evidence.outcome.scenarios.every((scenario) => (
      scenario.shapeProof.status === "exact"
        && scenario.shapeProof.mayPublishLayout
        && scenario.segmentationProof.status === "exact"
        && scenario.segmentationProof.mayPublishLayout
        && scenario.boundedSegmentation.status === "bounded-stable"
        && scenario.boundedSegmentation.attempts.length === 3
        && scenario.boundedSegmentation.stableExpansionCount === 2
        && !scenario.boundedSegmentation.oracleVerified
        && !scenario.boundedSegmentation.mayPublishLayout
        && scenario.work.rangeUtf16Length === 30
        && scenario.work.shapeUtf16ReductionRatio < 0.01
        && scenario.work.widestSegmentationContextUtf16Length < 320
    ))).toBe(true)
    expect(new Set(evidence.outcome.scenarios.map((scenario) => scenario.fontFaceId))).toEqual(
      new Set(["sarabun-regular", "sarabun-bold"]),
    )
  })

  it("retains diagnostic timings without claiming a product frame or publication gate", () => {
    expect(evidence.timing.fullShape.sampleCount).toBe(20)
    expect(evidence.timing.rangeShape.sampleCount).toBe(60)
    expect(evidence.timing.fullSegmentation.sampleCount).toBe(10)
    expect(evidence.timing.boundedSegmentation.sampleCount).toBe(60)
    expect(evidence.timing.rangeShape.p50Ms).toBeLessThan(evidence.timing.fullShape.p50Ms)
    expect(evidence.timing.boundedSegmentation.p50Ms).toBeLessThan(evidence.timing.fullSegmentation.p50Ms)
    expect(evidence.timing.timingIsDiagnosticOnly).toBe(true)
    expect(evidence.timing.productFrameGateClaimed).toBe(false)
    expect(evidence.contracts.rangeFactsMayPublishWithoutOracle).toBe(false)
    expect(evidence.scope).toMatchObject({
      textBlockEffectiveRunOnly: true,
      exactIntegerOracleComparison: true,
      actualContextualRangeShaping: true,
      actualBoundedRangeSegmentation: true,
      lineReassembly: false,
      productBinding: false,
      backendBinding: false,
      productionBinding: false,
    })
  })

  it("keeps the range runtime in a QA Worker and documents the next assembly gate", () => {
    const worker = read("src/qa/liveDraftMr1RangeEvidence.worker.ts")
    const page = read("src/qa/liveDraftMr1RangeEvidencePage.ts")
    const doc = read("docs/LIVE_DRAFT_MR1_CONTEXTUAL_RANGE_FACTS.md")

    expect(worker).toContain("createFlowDocTextEngineMr1BoundedSegmentationV1")
    expect(worker).toContain("compareFlowDocTextEngineMr1RangeShapeToFullOracleV1")
    expect(worker).not.toMatch(/fetch\(|XMLHttpRequest|@flowdoc\/vnext-core/u)
    expect(page).toContain("liveDraftMr1RangeEvidence.worker.ts")
    expect(doc).toContain("affected-window line builder")
    expect(doc).toContain("does not publish layout")
  })
})
