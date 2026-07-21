import {
  analyzeFlowDocTextEngineIncrementalReflowV1,
  FLOWDOC_TEXT_ENGINE_INCREMENTAL_REFLOW_POLICY_V1,
  FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
  type FlowDocTextEngineIncrementalEditV1,
  type FlowDocTextEngineIncrementalReflowAnalysisV1,
  type FlowDocTextEngineMultiRunLayoutInputV1,
  type FlowDocTextEngineMultiRunLayoutProfileV1,
} from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocTextEngineMr1WorkerRuntimeV1,
  type FlowDocTextEngineMr1WorkerFontV1,
  type FlowDocTextEngineMr1WorkerIdentityV1,
} from "@flowdoc/text-engine-rust-wasm/worker-mr1"
import {
  createFlowDocLiveDraftMr1HardBreakEditV1,
  createFlowDocLiveDraftMr1LongBlockInputV1,
  FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_FIELD_BOUNDARY_OFFSET,
  FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_STYLE_BOUNDARY_OFFSET,
  FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT,
  replaceFlowDocLiveDraftMr1LongBlockTextV1,
} from "./liveDraftMr1IncrementalReflowFixture"

interface RunRequestV1 {
  type: "live-draft-mr1-incremental-reflow.run"
  measurementProfileId: string
  wasmSha256: typeof FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256
  wasmBytes: ArrayBuffer
  fonts: FlowDocTextEngineMr1WorkerFontV1[]
  warmSampleCount: number
}

export type FlowDocLiveDraftMr1IncrementalReflowWorkerRequestV1 = RunRequestV1

interface ScenarioEvidenceV1 {
  scenarioId: string
  coverage: "start" | "middle" | "end" | "line-edge" | "page-edge" | "style-boundary" | "field-adjacency" | "fallback"
  edit: FlowDocTextEngineIncrementalEditV1
  analysis: FlowDocTextEngineIncrementalReflowAnalysisV1
  oracleFingerprint: string
  oracleCoreFingerprint: string
  oracleRepeatExact: boolean
  analysisDurationMs: number
  fullLayoutDurationMs: number[]
  phaseDurationMs: Array<FlowDocTextEngineMultiRunLayoutProfileV1["phaseDurationMs"]>
  work: FlowDocTextEngineMultiRunLayoutProfileV1["work"]
}

export type FlowDocLiveDraftMr1IncrementalReflowWorkerResponseV1 =
  | {
      type: "live-draft-mr1-incremental-reflow.result"
      identity: FlowDocTextEngineMr1WorkerIdentityV1
      baseline: {
        profile: Omit<FlowDocTextEngineMultiRunLayoutProfileV1, "result">
        layoutFingerprint: string
        coreLayoutFingerprint: string
      }
      scenarios: ScenarioEvidenceV1[]
      contracts: {
        fullLayoutOracleExecuted: true
        incrementalWindowMayPublishLayout: false
        partialShapingExecuted: false
        rendererMeasuredText: false
        backendBinding: false
        productBinding: false
        tableScope: false
      }
    }
  | { type: "live-draft-mr1-incremental-reflow.blocked"; message: string }

interface WorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<FlowDocLiveDraftMr1IncrementalReflowWorkerRequestV1>) => void,
  ): void
  postMessage(message: FlowDocLiveDraftMr1IncrementalReflowWorkerResponseV1): void
}

function withoutFonts(input: FlowDocTextEngineMultiRunLayoutInputV1) {
  const { fontFaces: _fontFaces, ...layout } = structuredClone(input)
  return layout
}

const workerScope = self as unknown as WorkerScopeV1

workerScope.addEventListener("message", (event) => {
  void (async () => {
    const request = event.data
    if (
      !Number.isSafeInteger(request.warmSampleCount)
      || request.warmSampleCount < 3
      || request.warmSampleCount > 30
    ) throw new Error("incremental reflow warm sample count is invalid")
    const runtime = await createFlowDocTextEngineMr1WorkerRuntimeV1({
      measurementProfileId: request.measurementProfileId,
      wasmSha256: request.wasmSha256,
      wasmBytes: request.wasmBytes,
      fonts: request.fonts,
    })
    const clock = { now: () => performance.now() }
    const baselineInput = createFlowDocLiveDraftMr1LongBlockInputV1(1)
    const baselineProfile = runtime.profileLayout(withoutFonts(baselineInput), clock)
    if (baselineProfile.result.status !== "accepted") {
      throw new Error(baselineProfile.result.issues.map((issue) => issue.message).join("\n"))
    }
    const baseline = baselineProfile.result
    const lines = baseline.layout.lines
    if (lines.length < 100) throw new Error("incremental long-block baseline did not produce 100 lines")
    const safeInside = (lineIndex: number) => {
      const line = lines[lineIndex]
      if (line == null) throw new Error(`incremental fixture line ${lineIndex} is missing`)
      return Math.min(line.renderEndOffset - 1, line.renderStartOffset + 1)
    }
    const edits: Array<{
      scenarioId: string
      coverage: ScenarioEvidenceV1["coverage"]
      input: FlowDocTextEngineMultiRunLayoutInputV1
      edit: FlowDocTextEngineIncrementalEditV1
    }> = []
    let revision = 2
    const insert = (
      scenarioId: string,
      coverage: ScenarioEvidenceV1["coverage"],
      offset: number,
      insertedText = "ก",
    ) => {
      edits.push({
        scenarioId,
        coverage,
        input: replaceFlowDocLiveDraftMr1LongBlockTextV1({
          previous: baselineInput,
          instanceRevision: revision++,
          startOffset: offset,
          insertedText,
        }),
        edit: {
          previousStartOffset: offset,
          previousEndOffset: offset,
          nextEndOffset: offset + insertedText.length,
        },
      })
    }
    insert("insert-near-start", "start", safeInside(1))
    insert("insert-near-middle", "middle", safeInside(Math.floor(lines.length / 2)))
    insert("insert-near-end", "end", safeInside(lines.length - 2))
    insert("insert-at-line-edge", "line-edge", lines[24]!.renderEndOffset)
    insert("insert-at-page-edge", "page-edge", lines[14]!.renderStartOffset)
    insert("insert-at-style-boundary", "style-boundary", FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_STYLE_BOUNDARY_OFFSET)
    insert("insert-next-to-resolved-field", "field-adjacency", FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_FIELD_BOUNDARY_OFFSET)
    const hardBreakOffset = safeInside(20)
    edits.push({
      scenarioId: "hard-break-edit-falls-back",
      coverage: "fallback",
      input: createFlowDocLiveDraftMr1HardBreakEditV1({
        previous: baselineInput,
        instanceRevision: revision++,
        offset: hardBreakOffset,
      }),
      edit: {
        previousStartOffset: hardBreakOffset,
        previousEndOffset: hardBreakOffset,
        nextEndOffset: hardBreakOffset + 1,
      },
    })
    const oversizedOffset = safeInside(Math.floor(lines.length / 2))
    const oversizedText = Array.from({ length: 90 }, () => FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT).join(" ")
    insert("oversized-window-falls-back", "fallback", oversizedOffset, oversizedText)

    const scenarios: ScenarioEvidenceV1[] = []
    for (const scenario of edits) {
      const profiles = Array.from({ length: request.warmSampleCount }, () => (
        runtime.profileLayout(withoutFonts(scenario.input), clock)
      ))
      const oracle = profiles[0]!.result
      if (oracle.status !== "accepted") throw new Error(
        `${scenario.scenarioId}: ${oracle.issues.map((issue) => issue.message).join("\n")}`,
      )
      const reference = JSON.stringify(oracle)
      const oracleRepeatExact = profiles.every((profile) => JSON.stringify(profile.result) === reference)
      const analysisStartedAt = performance.now()
      const analysis = analyzeFlowDocTextEngineIncrementalReflowV1({
        previous: baseline,
        nextOracle: oracle,
        edit: scenario.edit,
        policy: FLOWDOC_TEXT_ENGINE_INCREMENTAL_REFLOW_POLICY_V1,
      })
      const analysisDurationMs = performance.now() - analysisStartedAt
      scenarios.push({
        scenarioId: scenario.scenarioId,
        coverage: scenario.coverage,
        edit: scenario.edit,
        analysis,
        oracleFingerprint: oracle.fingerprint,
        oracleCoreFingerprint: oracle.layout.fingerprint,
        oracleRepeatExact,
        analysisDurationMs,
        fullLayoutDurationMs: profiles.map((profile) => profile.totalDurationMs),
        phaseDurationMs: profiles.map((profile) => profile.phaseDurationMs),
        work: profiles[0]!.work,
      })
    }
    const { result: _result, ...baselineProfileFacts } = baselineProfile
    workerScope.postMessage({
      type: "live-draft-mr1-incremental-reflow.result",
      identity: runtime.identity,
      baseline: {
        profile: baselineProfileFacts,
        layoutFingerprint: baseline.fingerprint,
        coreLayoutFingerprint: baseline.layout.fingerprint,
      },
      scenarios,
      contracts: {
        fullLayoutOracleExecuted: true,
        incrementalWindowMayPublishLayout: false,
        partialShapingExecuted: false,
        rendererMeasuredText: false,
        backendBinding: false,
        productBinding: false,
        tableScope: false,
      },
    })
  })().catch((error: unknown) => workerScope.postMessage({
    type: "live-draft-mr1-incremental-reflow.blocked",
    message: error instanceof Error ? error.message : String(error),
  }))
})
