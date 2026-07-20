import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface Xr2EvidenceV1 {
  evidenceId: string
  status: string
  samples: { coldPerRow: number; warmPerRow: number }
  rows: Array<{
    status: string
    textLength: number
    parity: Record<string, boolean | string>
    correctness: {
      acceptanceSummary: { lineCount: number }
      pagination: { summary: { pageCount: number } }
    }
    node: { cold: { providerInvocationCount: number }; warm: { providerInvocationCount: number } }
    browserWorker: { cold: { providerInvocationCount: number }; warm: { providerInvocationCount: number } }
  }>
  interpretation: Record<string, boolean>
  scope: Record<string, boolean>
}

describe("LIVE-DRAFT-XR-2 retained one-block evidence", () => {
  it("retains bounded exact parity and observational timings without inventing a budget", () => {
    const evidence = JSON.parse(readFileSync(
      new URL("../fixtures/live-draft-xr2-one-block-performance-parity.v1.json", import.meta.url),
      "utf8",
    )) as Xr2EvidenceV1

    expect(evidence.evidenceId).toBe("live-draft-xr2-one-block-performance-parity-v1")
    expect(evidence.status).toBe("observed-bounded-parity-no-budget")
    expect(evidence.samples).toEqual({ coldPerRow: 5, warmPerRow: 25 })
    expect(evidence.rows).toHaveLength(3)
    expect(evidence.rows.every((row) => (
      row.status === "matched"
      && row.textLength > 0
      && row.parity.normalizedEngineResultExact === true
      && row.parity.coreLineGeometryAndPaginationExact === true
      && row.parity.allRepeatedSamplesConsistent === true
      && row.correctness.acceptanceSummary.lineCount > 0
      && row.correctness.pagination.summary.pageCount > 0
      && row.node.cold.providerInvocationCount === evidence.samples.coldPerRow
      && row.browserWorker.cold.providerInvocationCount === evidence.samples.coldPerRow
      && row.node.warm.providerInvocationCount === 0
      && row.browserWorker.warm.providerInvocationCount === 0
    ))).toBe(true)
    expect(evidence.interpretation).toEqual({
      performanceBudgetDefined: false,
      measurementsAreObservational: true,
      cacheHitAvoidsEngineProvider: true,
      boundedWorkloadParityOnly: true,
    })
    expect(evidence.scope).toEqual({
      productionBinding: false,
      defaultMeasurerReplacement: false,
      formBinding: false,
      editorUiBinding: false,
      backendRequestPerKeystroke: false,
      wholeDocumentIncrementalInvalidation: false,
      productionPerformanceClaim: false,
    })
  })
})
