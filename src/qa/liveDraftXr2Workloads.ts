import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1 } from "@flowdoc/text-engine-rust-wasm/live-draft-smoke"

export const FLOWDOC_LIVE_DRAFT_XR2_COLD_SAMPLE_COUNT = 5
export const FLOWDOC_LIVE_DRAFT_XR2_WARM_SAMPLE_COUNT = 25

const thai = FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[0].text
const latin = FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[1].text
const mixedUnit = `${thai} ${latin}`
const repeated = (count: number): string => Array.from({ length: count }, () => mixedUnit).join(" ")

export interface FlowDocLiveDraftXr2WorkloadV1 {
  rowId: string
  fixtureId: string
  scenarioId: string
  scale: "short" | "medium" | "long"
  text: string
  fontId: "sarabun-regular"
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf"
  fontSha256: string
  availableWidthPt: number
  fontSizePt: number
  lineHeightPt: number
  pageBodyHeightPt: number
  styleKey: string
}

export const FLOWDOC_LIVE_DRAFT_XR2_WORKLOADS_V1 = [{
  rowId: "live-draft-xr2-short-thai",
  fixtureId: "v1-measure-thai-line-break-core",
  scenarioId: "xr2-one-block-short",
  scale: "short",
  text: thai,
  fontId: "sarabun-regular",
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf",
  fontSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[0].fontSha256,
  availableWidthPt: 144,
  fontSizePt: 12,
  lineHeightPt: 18,
  pageBodyHeightPt: 252,
  styleKey: "paragraph/sarabun-regular-12-18",
}, {
  rowId: "live-draft-xr2-medium-mixed",
  fixtureId: "xr2-derived-accepted-smoke-rows",
  scenarioId: "xr2-one-block-medium",
  scale: "medium",
  text: repeated(24),
  fontId: "sarabun-regular",
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf",
  fontSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[0].fontSha256,
  availableWidthPt: 180,
  fontSizePt: 12,
  lineHeightPt: 18,
  pageBodyHeightPt: 252,
  styleKey: "paragraph/sarabun-regular-12-18",
}, {
  rowId: "live-draft-xr2-long-mixed",
  fixtureId: "xr2-derived-accepted-smoke-rows",
  scenarioId: "xr2-one-block-long",
  scale: "long",
  text: repeated(160),
  fontId: "sarabun-regular",
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf",
  fontSha256: FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SMOKE_ROWS_V1[0].fontSha256,
  availableWidthPt: 240,
  fontSizePt: 12,
  lineHeightPt: 18,
  pageBodyHeightPt: 252,
  styleKey: "paragraph/sarabun-regular-12-18",
}] as const satisfies readonly FlowDocLiveDraftXr2WorkloadV1[]
