import {
  compareFlowDocTextEngineMr1RangeSegmentationToFullOracleV1,
  compareFlowDocTextEngineMr1RangeShapeToFullOracleV1,
  createFlowDocTextEngineMr1BoundedSegmentationV1,
  FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_SHA256,
  type FlowDocTextEngineMr1BoundedSegmentationV1,
  type FlowDocTextEngineMr1RangeOracleProofV1,
} from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocTextEngineMr1RangeWorkerRuntimeV1,
  type FlowDocTextEngineMr1RangeWorkerFontV1,
  type FlowDocTextEngineMr1RangeWorkerRuntimeV1,
} from "@flowdoc/text-engine-rust-wasm/worker-mr1-range"
import {
  FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT,
  FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT,
} from "./liveDraftMr1IncrementalReflowFixture"

interface RunRequestV1 {
  type: "live-draft-mr1-range.run"
  measurementProfileId: string
  wasmSha256: typeof FLOWDOC_TEXT_ENGINE_MR1_RANGE_WASM_SHA256
  wasmBytes: ArrayBuffer
  fonts: FlowDocTextEngineMr1RangeWorkerFontV1[]
  warmSampleCount: number
}

export type FlowDocLiveDraftMr1RangeWorkerRequestV1 = RunRequestV1

interface ScenarioEvidenceV1 {
  scenarioId: string
  unitIndex: number
  fontFaceId: string
  rangeStartUtf16: number
  rangeEndUtf16: number
  shapeContextStartUtf16: number
  shapeContextEndUtf16: number
  shapeProof: FlowDocTextEngineMr1RangeOracleProofV1
  segmentationProof: FlowDocTextEngineMr1RangeOracleProofV1
  boundedSegmentation: Pick<
    FlowDocTextEngineMr1BoundedSegmentationV1,
    "status" | "reasonCode" | "attempts" | "stableExpansionCount" | "oracleVerified" | "mayPublishLayout"
  >
  work: {
    fullTextUtf16Length: number
    rangeUtf16Length: number
    rangeGlyphCount: number
    fullGlyphCount: number
    targetBreakCount: number
    fullBreakCount: number
    shapeUtf16ReductionRatio: number
    widestSegmentationContextUtf16Length: number
  }
  timing: {
    rangeShapeDurationMs: number[]
    boundedSegmentationDurationMs: number[]
  }
}

export type FlowDocLiveDraftMr1RangeWorkerResponseV1 =
  | {
      type: "live-draft-mr1-range.result"
      identity: FlowDocTextEngineMr1RangeWorkerRuntimeV1["identity"]
      baseline: {
        fullTextUtf16Length: number
        fullTextScalarCount: number
        fullShapeDurationMsByFontFaceId: Record<string, number[]>
        fullSegmentationDurationMs: number[]
      }
      scenarios: ScenarioEvidenceV1[]
      contracts: {
        fullOracleExecuted: true
        contextualRangeShapingExecuted: true
        boundedRangeSegmentationExecuted: true
        artificialContextEndpointsExcluded: true
        exactIntegerGlyphComparison: true
        rangeFactsMayPublishWithoutOracle: false
        rendererMeasuredText: false
        backendBinding: false
        productBinding: false
        tableScope: false
      }
    }
  | { type: "live-draft-mr1-range.blocked"; message: string }

interface WorkerScopeV1 {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<FlowDocLiveDraftMr1RangeWorkerRequestV1>) => void,
  ): void
  postMessage(message: FlowDocLiveDraftMr1RangeWorkerResponseV1): void
}

function timed<T>(operation: () => T): { value: T; durationMs: number } {
  const startedAt = performance.now()
  const value = operation()
  return { value, durationMs: performance.now() - startedAt }
}

function requireFact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const workerScope = self as unknown as WorkerScopeV1

workerScope.addEventListener("message", (event) => {
  void (async () => {
    const request = event.data
    requireFact(
      Number.isSafeInteger(request.warmSampleCount)
        && request.warmSampleCount >= 5
        && request.warmSampleCount <= 30,
      "MR1 range warm sample count is invalid",
    )
    const runtime = await createFlowDocTextEngineMr1RangeWorkerRuntimeV1({
      measurementProfileId: request.measurementProfileId,
      wasmSha256: request.wasmSha256,
      wasmBytes: request.wasmBytes,
      fonts: request.fonts,
    })
    const text = FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT
    const separatorLength = 1
    const unitStride = FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT.length + separatorLength
    const scenarioInputs = [
      { scenarioId: "near-start-regular", unitIndex: 1, fontFaceId: "sarabun-regular" },
      { scenarioId: "first-quarter-bold", unitIndex: 39, fontFaceId: "sarabun-bold" },
      { scenarioId: "middle-regular", unitIndex: 79, fontFaceId: "sarabun-regular" },
      { scenarioId: "middle-bold", unitIndex: 80, fontFaceId: "sarabun-bold" },
      { scenarioId: "last-quarter-regular", unitIndex: 119, fontFaceId: "sarabun-regular" },
      { scenarioId: "near-end-bold", unitIndex: 158, fontFaceId: "sarabun-bold" },
    ] as const
    const fullShapeByFontFaceId = new Map(request.fonts.map(({ face }) => [
      face.fontFaceId,
      runtime.shapeFull({ text, fontFaceId: face.fontFaceId }),
    ]))
    const fullSegmentation = runtime.segmentFull(text)
    const fullShapeDurationMsByFontFaceId: Record<string, number[]> = {}
    for (const { face } of request.fonts) {
      fullShapeDurationMsByFontFaceId[face.fontFaceId] = Array.from(
        { length: request.warmSampleCount },
        () => timed(() => runtime.shapeFull({ text, fontFaceId: face.fontFaceId })).durationMs,
      )
    }
    const fullSegmentationDurationMs = Array.from(
      { length: request.warmSampleCount },
      () => timed(() => runtime.segmentFull(text)).durationMs,
    )

    const scenarios: ScenarioEvidenceV1[] = scenarioInputs.map((scenario) => {
      const fullShape = fullShapeByFontFaceId.get(scenario.fontFaceId)
      requireFact(fullShape != null, `MR1 range full oracle font is missing: ${scenario.fontFaceId}`)
      const rangeStartUtf16 = scenario.unitIndex * unitStride
      const rangeEndUtf16 = rangeStartUtf16 + FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT.length
      const shapeContextStartUtf16 = Math.max(0, rangeStartUtf16 - 24)
      const shapeContextEndUtf16 = Math.min(text.length, rangeEndUtf16 + 24)
      const shapeRange = () => runtime.shapeRange({
        text,
        fontFaceId: scenario.fontFaceId,
        rangeStartUtf16,
        rangeEndUtf16,
        contextStartUtf16: shapeContextStartUtf16,
        contextEndUtf16: shapeContextEndUtf16,
      })
      const shape = shapeRange()
      const boundedRange = () => createFlowDocTextEngineMr1BoundedSegmentationV1({
        text,
        targetStartUtf16: rangeStartUtf16,
        targetEndUtf16: rangeEndUtf16,
        initialContextUtf16: 32,
        maxContextUtf16: 512,
        requiredStableExpansionCount: 2,
        runtime,
      })
      const bounded = boundedRange()
      const shapeProof = compareFlowDocTextEngineMr1RangeShapeToFullOracleV1({
        range: shape,
        full: fullShape,
      })
      const segmentationProof = compareFlowDocTextEngineMr1RangeSegmentationToFullOracleV1({
        range: bounded.facts,
        full: fullSegmentation,
      })
      requireFact(shapeProof.status === "exact", `${scenario.scenarioId}: range shape oracle mismatch`)
      requireFact(bounded.status === "bounded-stable", `${scenario.scenarioId}: bounded segmentation did not stabilize`)
      requireFact(segmentationProof.status === "exact", `${scenario.scenarioId}: range segmentation oracle mismatch`)
      const widestSegmentationContextUtf16Length = Math.max(...bounded.attempts.map((attempt) => (
        attempt.contextEndUtf16 - attempt.contextStartUtf16
      )))
      return {
        ...scenario,
        rangeStartUtf16,
        rangeEndUtf16,
        shapeContextStartUtf16,
        shapeContextEndUtf16,
        shapeProof,
        segmentationProof,
        boundedSegmentation: {
          status: bounded.status,
          reasonCode: bounded.reasonCode,
          attempts: bounded.attempts,
          stableExpansionCount: bounded.stableExpansionCount,
          oracleVerified: bounded.oracleVerified,
          mayPublishLayout: bounded.mayPublishLayout,
        },
        work: {
          fullTextUtf16Length: text.length,
          rangeUtf16Length: rangeEndUtf16 - rangeStartUtf16,
          rangeGlyphCount: shape.glyphs.length,
          fullGlyphCount: fullShape.glyphs.length,
          targetBreakCount: bounded.facts.targetBreakByteOffsets.length,
          fullBreakCount: fullSegmentation.breakByteOffsets.length,
          shapeUtf16ReductionRatio: (rangeEndUtf16 - rangeStartUtf16) / text.length,
          widestSegmentationContextUtf16Length,
        },
        timing: {
          rangeShapeDurationMs: Array.from(
            { length: request.warmSampleCount },
            () => timed(shapeRange).durationMs,
          ),
          boundedSegmentationDurationMs: Array.from(
            { length: request.warmSampleCount },
            () => timed(boundedRange).durationMs,
          ),
        },
      }
    })

    workerScope.postMessage({
      type: "live-draft-mr1-range.result",
      identity: runtime.identity,
      baseline: {
        fullTextUtf16Length: text.length,
        fullTextScalarCount: [...text].length,
        fullShapeDurationMsByFontFaceId,
        fullSegmentationDurationMs,
      },
      scenarios,
      contracts: {
        fullOracleExecuted: true,
        contextualRangeShapingExecuted: true,
        boundedRangeSegmentationExecuted: true,
        artificialContextEndpointsExcluded: true,
        exactIntegerGlyphComparison: true,
        rangeFactsMayPublishWithoutOracle: false,
        rendererMeasuredText: false,
        backendBinding: false,
        productBinding: false,
        tableScope: false,
      },
    })
  })().catch((error: unknown) => workerScope.postMessage({
    type: "live-draft-mr1-range.blocked",
    message: error instanceof Error ? error.message : String(error),
  }))
})
