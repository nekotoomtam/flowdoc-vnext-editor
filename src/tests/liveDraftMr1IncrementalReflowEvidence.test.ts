import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import evidence from "../fixtures/live-draft-mr1-incremental-reflow-analysis.v1.json"

function read(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")
}

describe("MR1 incremental reflow analysis evidence", () => {
  it("proves six exact oracle windows and retains end, hard-break, and oversized fallback", () => {
    expect(evidence.status).toBe("accepted-oracle-only-incremental-window")
    expect(evidence.execution).toMatchObject({
      realChromeWorkerWasm: true,
      fullLayoutOracleExecuted: true,
      diagnosticPhaseTiming: true,
      boundedScenarioCount: 6,
      fallbackScenarioCount: 3,
      warmSamplesPerScenario: 10,
      backendRequestCount: 0,
      incrementalWindowMayPublishLayout: false,
      partialShapingExecuted: false,
      productBinding: false,
      productionBinding: false,
    })
    expect(evidence.baseline).toMatchObject({
      renderedUtf16Length: 4_959,
      sourceRunCount: 5,
      effectiveRunCount: 3,
      shapingRunCount: 3,
      clusterCount: 4_319,
      breakOpportunityCount: 1_121,
      lineCount: 124,
    })
    expect(evidence.outcome.boundedAccepted).toBe(true)
    expect(evidence.outcome.fallbackAccepted).toBe(true)
    expect(evidence.outcome.boundedCoverage).toEqual([
      "end",
      "field-adjacency",
      "line-edge",
      "middle",
      "page-edge",
      "start",
      "style-boundary",
    ])
    const proved = evidence.outcome.scenarios.filter((scenario) => scenario.analysis.status === "window-proved")
    expect(proved).toHaveLength(6)
    expect(proved.every((scenario) => (
      scenario.oracleRepeatExact
      && scenario.analysis.work.exactIntegerGeometry
      && scenario.analysis.work.reflowedNextLineCount <= 32
      && scenario.analysis.work.reflowedNextUtf16Length <= 2_048
    ))).toBe(true)
    expect(evidence.outcome.fallbackCodes).toEqual([
      "hard-break-edited",
      "reconvergence-not-found",
      "reconvergence-not-found",
    ])
  })

  it("retains diagnostic stage timing without claiming an interaction gate or layout authority", () => {
    expect(evidence.timing.fullLayout.sampleCount).toBe(90)
    expect(evidence.timing.productFrameGateClaimed).toBe(false)
    expect(evidence.timing.timingIsDiagnosticOnly).toBe(true)
    expect(evidence.timing.tokenImpact.sampleCount).toBe(25)
    expect(evidence.timing.oracleAnalysis.sampleCount).toBe(9)
    expect(Object.values(evidence.timing.phases).every((phase) => phase.sampleCount === 90)).toBe(true)
    expect(evidence.outcome.tokenImpact.contracts).toEqual({
      purpose: "scheduling-and-invalidation-hint",
      lineBreakAuthority: false,
      geometryAuthority: false,
      exactLayoutStillRequired: true,
    })
    expect(evidence.contracts).toEqual({
      fullLayoutOracleExecuted: true,
      incrementalWindowMayPublishLayout: false,
      partialShapingExecuted: false,
      rendererMeasuredText: false,
      backendBinding: false,
      productBinding: false,
      tableScope: false,
    })
  })

  it("keeps the QA Worker separate from product and documents the next contextual shaping gate", () => {
    const worker = read("src/qa/liveDraftMr1IncrementalReflowEvidence.worker.ts")
    const impact = read("src/editor/liveDraft/liveDraftMultiBlockImpact.ts")
    const doc = read("docs/LIVE_DRAFT_MR1_INCREMENTAL_REFLOW_ANALYSIS.md")

    expect(worker).toContain("profileLayout")
    expect(worker).toContain("analyzeFlowDocTextEngineIncrementalReflowV1")
    expect(worker).not.toMatch(/fetch\(|XMLHttpRequest|@flowdoc\/vnext-core/u)
    expect(impact).toContain('purpose: "scheduling-and-invalidation-hint"')
    expect(doc).toContain("versioned Rust/WASM range-shaping facts with explicit")
    expect(doc).toContain("No product frame budget")
  })
})
