import {
  FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
} from "@flowdoc/text-engine-rust-wasm"
import { runFlowDocTextEngineNodeMultiRunLayoutV1 } from "@flowdoc/text-engine-rust-wasm/node"
import { createFlowDocLiveDraftMr1LayoutInputV1 } from "../src/qa/liveDraftMr1Fixture"

export function runNodeMr1Evidence() {
  const startedAt = performance.now()
  const execution = runFlowDocTextEngineNodeMultiRunLayoutV1({
    layout: createFlowDocLiveDraftMr1LayoutInputV1(),
    wasmSha256: FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256,
  })
  return {
    durationMs: performance.now() - startedAt,
    ...execution,
  }
}

export { FLOWDOC_TEXT_ENGINE_MR1_WASM_SHA256 }
