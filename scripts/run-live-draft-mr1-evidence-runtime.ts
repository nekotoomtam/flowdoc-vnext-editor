import {
  FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
} from "@flowdoc/text-engine-rust-wasm"
import { runFlowDocTextEngineNodeMultiRunLayoutV1 } from "@flowdoc/text-engine-rust-wasm/node"
import { createFlowDocLiveDraftMr1LayoutInputV1 } from "../src/qa/liveDraftMr1Fixture"
import { projectCoreLiveDraftMultiRunDisplayListV1 } from "../src/core/coreAdapter"
import {
  FLOWDOC_LIVE_DRAFT_MR1_CANVAS_ORIGIN,
  FLOWDOC_LIVE_DRAFT_MR1_CANVAS_PROJECTION_ID,
} from "../src/qa/liveDraftMr1CanvasFixture"

export function runNodeMr1Evidence() {
  const startedAt = performance.now()
  const execution = runFlowDocTextEngineNodeMultiRunLayoutV1({
    layout: createFlowDocLiveDraftMr1LayoutInputV1(),
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
  })
  const displayList = execution.result.status === "accepted"
    ? projectCoreLiveDraftMultiRunDisplayListV1({
        projectionId: FLOWDOC_LIVE_DRAFT_MR1_CANVAS_PROJECTION_ID,
        layout: execution.result.layout,
        origin: FLOWDOC_LIVE_DRAFT_MR1_CANVAS_ORIGIN,
      })
    : null
  return {
    durationMs: performance.now() - startedAt,
    ...execution,
    displayList,
  }
}

export { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 }
