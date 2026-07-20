import {
  createFlowDocTextEngineLiveDraftMeasurementV1,
  runFlowDocTextEngineNodeTextV1,
} from "@flowdoc/text-engine-rust-wasm/node"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import { createCoreLiveDraftOneBlockLayoutSessionV1 } from "../src/core/coreAdapter"
import {
  FLOWDOC_LIVE_DRAFT_XR5_BLOCKED_ROWS_V1,
  FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1,
  FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1,
  FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT,
} from "../src/qa/liveDraftXr5Matrix"

export function runNodeXr5Rows() {
  return FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1.map((row) => {
    const session = createCoreLiveDraftOneBlockLayoutSessionV1({
      measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
      profileRevision: "node-native-rustybuzz-icu4x-xr5-v1",
    })
    let normalizedResult: unknown = null
    let nodeRuntimeIdentity: unknown = null
    const runSample = (clearCache: boolean) => {
      if (clearCache) session.clearCache()
      const startedAt = performance.now()
      const coreLayout = session.layout({
        documentId: "live-draft-xr5-matrix-document",
        instanceRevision: 1,
        sectionId: "live-draft-xr5-section",
        textBlockId: `live-draft-xr5:${row.rowId}`,
        text: row.text,
        availableWidthPt: row.availableWidthPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
        styleKey: row.styleKey,
        ...(row.sourceRuns == null ? {} : { sourceRuns: row.sourceRuns.map((run) => ({ ...run })) }),
        displayList: { ...row.displayList },
      }, (engineInput) => {
        const native = runFlowDocTextEngineNodeTextV1({
          text: engineInput.text,
          fontId: row.fontId,
          fontAssetPath: row.fontAssetPath,
          fontSha256: row.fontSha256,
          measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
          wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
        })
        normalizedResult ??= native.result
        nodeRuntimeIdentity ??= native.identity
        return createFlowDocTextEngineLiveDraftMeasurementV1({
          measurement: native.result,
          availableWidthPt: engineInput.availableWidthPt,
          fontSizePt: row.fontSizePt,
          lineHeightPt: row.lineHeightPt,
        })
      })
      return { totalDurationMs: performance.now() - startedAt, coreLayout }
    }
    const cold = runSample(true)
    const warm = runSample(false)
    if (normalizedResult == null || nodeRuntimeIdentity == null) {
      throw new Error(`Node XR5 row did not invoke its renderer-backed provider: ${row.rowId}`)
    }
    return {
      rowId: row.rowId,
      fixtureId: row.fixtureId,
      scenarioId: row.scenarioId,
      coverage: row.coverage,
      textLength: row.text.length,
      fontId: row.fontId,
      styleKey: row.styleKey,
      geometry: {
        availableWidthPt: row.availableWidthPt,
        fontSizePt: row.fontSizePt,
        lineHeightPt: row.lineHeightPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
      },
      expected: row.expected,
      normalizedResult,
      nodeRuntimeIdentity,
      cold,
      warm,
    }
  })
}

export { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 }
export {
  FLOWDOC_LIVE_DRAFT_XR5_BLOCKED_ROWS_V1,
  FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1,
  FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1,
  FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT,
}
