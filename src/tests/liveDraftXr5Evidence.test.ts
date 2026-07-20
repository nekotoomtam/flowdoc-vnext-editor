import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface Xr5EvidenceV1 {
  evidenceId: string
  status: string
  driftPolicy: {
    numericPointMaxAbsDrift: number
    numericEngineFactMaxAbsDrift: number
    mismatchDisposition: string
  }
  crossRuntimeDriftSummary: {
    normalizedEngineMaxAbs: number
    coreLineAndPageMaxAbsPt: number
    displayListMaxAbsPt: number
    defaultApproximateMeasurerCompared: boolean
    satisfiesV1RendererBackedApproximateDriftFixture: boolean
  }
  digestParitySummary: Record<string, boolean | string>
  matrix: {
    inheritedAcceptedPrerequisites: string[]
    executedRowCount: number
    blockedRowCount: number
    releaseGatingStatus: string
    generalCrossRuntimeExactnessClaim: boolean
  }
  rows: Array<{
    rowId: string
    fixtureId: string
    scenarioId: string
    coverage: string
    fontId: string
    status: string
    outcome: { lineCount: number; pageCount: number; commandCount: number; sourceSegmentCount: number }
    parity: Record<string, boolean | string>
    drift: { normalizedEngineMaxAbs: number; coreLineAndPageMaxAbsPt: number; displayListMaxAbsPt: number; status: string }
    correctness: {
      displayList: {
        status: string
        commands: Array<{ sourceSegments?: Array<{ kind: string; fieldKey?: string; renderedText: string }> }>
      }
    }
    node: { cold: { cacheStatus: string }; warm: { cacheStatus: string; providerInvoked: boolean } }
    browserWorker: { cold: { cacheStatus: string }; warm: { cacheStatus: string; providerInvoked: boolean } }
  }>
  blockedRows: Array<{ fixtureId: string; scenarioId: string; status: string; blockerCodes: string[]; missingFacts: string[] }>
  interpretation: Record<string, boolean>
  scope: Record<string, boolean>
}

describe("LIVE-DRAFT-XR5 retained cross-runtime matrix evidence", () => {
  it("retains accepted Node/Browser rows and explicit blockers without widening exactness", () => {
    const evidence = JSON.parse(readFileSync(
      new URL("../fixtures/live-draft-xr5-cross-runtime-matrix.v1.json", import.meta.url),
      "utf8",
    )) as Xr5EvidenceV1

    expect(evidence.evidenceId).toBe("live-draft-xr5-cross-runtime-matrix-v1")
    expect(evidence.status).toBe("partial-release-matrix-accepted-with-explicit-blockers")
    expect(evidence.rows).toHaveLength(9)
    expect(evidence.blockedRows).toHaveLength(5)
    expect(evidence.matrix).toMatchObject({
      inheritedAcceptedPrerequisites: ["v1-measure-thai-line-break-core", "v1-measure-latin-product-paragraphs"],
      executedRowCount: 9,
      blockedRowCount: 5,
      releaseGatingStatus: "partial-not-accepted",
      generalCrossRuntimeExactnessClaim: false,
    })
    expect(evidence.rows.every((row) => (
      row.status === "accepted-xr5-bounded"
      && row.outcome.lineCount > 0
      && row.outcome.pageCount > 0
      && row.outcome.commandCount === row.outcome.lineCount
      && row.parity.normalizedEngineResultExact === true
      && row.parity.coreLineAndPageGeometryExact === true
      && row.parity.displayListCommandsExact === true
      && row.parity.repeatedSamplesExact === true
      && row.parity.cachePolicyExact === true
      && row.drift.normalizedEngineMaxAbs === 0
      && row.drift.coreLineAndPageMaxAbsPt === 0
      && row.drift.displayListMaxAbsPt === 0
      && row.node.cold.cacheStatus === "miss"
      && row.browserWorker.cold.cacheStatus === "miss"
      && row.node.warm.cacheStatus === "hit"
      && row.browserWorker.warm.cacheStatus === "hit"
      && row.node.warm.providerInvoked === false
      && row.browserWorker.warm.providerInvoked === false
    ))).toBe(true)

    const narrow = evidence.rows.find((row) => row.scenarioId === "line-wrap-narrow-24pt")!
    const wide = evidence.rows.find((row) => row.scenarioId === "line-wrap-wide-10000pt")!
    expect(narrow.outcome.lineCount).toBeGreaterThan(wide.outcome.lineCount)
    expect(wide.outcome.lineCount).toBe(1)
    expect(narrow.parity.normalizedResultSha256).toBe(wide.parity.normalizedResultSha256)

    const field = evidence.rows.find((row) => row.coverage === "field-adjacency")!
    expect(field.correctness.displayList.commands.flatMap((command) => command.sourceSegments ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "resolved-field", fieldKey: "customer.name" }),
    ]))
    const forced = evidence.rows.find((row) => row.coverage === "forced-line-break")!
    expect(forced.outcome.lineCount).toBe(3)
    expect(forced.correctness.displayList.commands.flatMap((command) => command.sourceSegments ?? [])).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "hard-break", renderedText: "\n" }),
    ]))
    const long = evidence.rows.find((row) => row.coverage === "long-block")!
    expect(long.outcome).toMatchObject({ lineCount: 120, pageCount: 9, commandCount: 120 })
    expect(evidence.rows.filter((row) => row.coverage === "style-font-map").map((row) => row.fontId).sort()).toEqual([
      "sarabun-bold",
      "sarabun-regular",
    ])

    expect(evidence.driftPolicy).toMatchObject({
      numericPointMaxAbsDrift: 0.000001,
      numericEngineFactMaxAbsDrift: 0,
      mismatchDisposition: "blocked",
    })
    expect(evidence.crossRuntimeDriftSummary).toMatchObject({
      normalizedEngineMaxAbs: 0,
      coreLineAndPageMaxAbsPt: 0,
      displayListMaxAbsPt: 0,
      defaultApproximateMeasurerCompared: false,
      satisfiesV1RendererBackedApproximateDriftFixture: false,
    })
    expect(evidence.digestParitySummary).toMatchObject({
      status: "matched-xr5-runtime-context",
      measurementProfileMatch: true,
      wasmDigestMatch: true,
      fontDigestsMatch: true,
      normalizedRowsExact: true,
    })
    expect(new Set(evidence.blockedRows.map((row) => row.fixtureId))).toEqual(new Set([
      "v1-measure-styled-inline-font-map",
      "v1-measure-table-cell-constrained",
      "v1-measure-repeated-header-table-lines",
      "v1-measure-multiline-forced-break",
      "v1-measure-renderer-backed-drift-summary",
    ]))
    expect(evidence.blockedRows.every((row) => row.status === "blocked" && row.blockerCodes.length > 0 && row.missingFacts.length > 0)).toBe(true)
    expect(evidence.interpretation.performanceBudgetDefined).toBe(false)
    expect(evidence.interpretation.wholeDocumentExactnessClaim).toBe(false)
    expect(evidence.interpretation.glyphPixelExactnessClaim).toBe(false)
    expect(evidence.scope.productionBinding).toBe(false)
    expect(evidence.scope.defaultMeasurerReplacement).toBe(false)
    expect(evidence.scope.backendRequestPerKeystroke).toBe(false)
  })
})
