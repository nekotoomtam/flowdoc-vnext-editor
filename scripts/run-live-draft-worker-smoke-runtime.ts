import {
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1,
  FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1,
} from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"
import { runFlowDocTextEngineNodeSmokeRowV1 } from "@flowdoc/text-engine-rust-wasm/node"

export function runNodeSmokeRows() {
  return FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1.map((row) => ({
    rowId: row.rowId,
    fixtureId: row.fixtureId,
    scenarioId: row.scenarioId,
    ...runFlowDocTextEngineNodeSmokeRowV1({
      row,
      measurementProfileId: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.measurementProfileId,
      wasmSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1.wasmSha256,
    }),
  }))
}

export { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_IDENTITY_V1 }
