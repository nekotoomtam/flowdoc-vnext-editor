import {
  createFlowDocTextEngineLiveDraftMeasurementV1,
  runFlowDocTextEngineNodeTextV1,
} from "@flowdoc/text-engine-rust-wasm/node"
import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import { createCoreLiveDraftOneBlockLayoutSessionV1 } from "../src/core/coreAdapter"
import {
  FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT,
  FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT,
  FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1,
} from "../src/qa/liveDraftXr2Workloads"

export function runNodeXr2Rows() {
  const session = createCoreLiveDraftOneBlockLayoutSessionV1({
    measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
    profileRevision: "node-native-rustybuzz-icu4x-xr2-v1",
  })

  return FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1.map((row) => {
    let firstNormalizedResult: unknown = null
    let nodeRuntimeIdentity: unknown = null
    const runSample = (clearCache: boolean) => {
      if (clearCache) session.clearCache()
      const startedAt = performance.now()
      const coreLayout = session.layout({
        documentId: "live-draft-xr2-evidence-document",
        instanceRevision: 1,
        sectionId: "live-draft-xr2-section",
        textBlockId: `live-draft-xr2:${row.rowId}`,
        text: row.text,
        availableWidthPt: row.availableWidthPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
        styleKey: row.styleKey,
      }, (engineInput) => {
        const native = runFlowDocTextEngineNodeTextV1({
          text: engineInput.text,
          fontId: row.fontId,
          fontAssetPath: row.fontAssetPath,
          fontSha256: row.fontSha256,
          measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
          wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
        })
        firstNormalizedResult ??= native.result
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
    const cold = Array.from({ length: FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT }, () => runSample(true))
    const warm = Array.from({ length: FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT }, () => runSample(false))
    return {
      rowId: row.rowId,
      fixtureId: row.fixtureId,
      scenarioId: row.scenarioId,
      scale: row.scale,
      textLength: row.text.length,
      geometry: {
        availableWidthPt: row.availableWidthPt,
        fontSizePt: row.fontSizePt,
        lineHeightPt: row.lineHeightPt,
        pageBodyHeightPt: row.pageBodyHeightPt,
      },
      normalizedResult: firstNormalizedResult,
      nodeRuntimeIdentity,
      cold,
      warm,
    }
  })
}

export {
  FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT,
  FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
}
