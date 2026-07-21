import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1,
  type FlowDocTextEngineMultiRunLayoutInputV1,
} from "@flowdoc/text-engine-rust-wasm"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"

export const FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PROJECTION_ID =
  "live-draft-mr1-multiline-display-list-v1" as const
export const FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_ORIGIN = {
  xLayoutUnit: 72_000_000,
  yLayoutUnit: 72_000_000,
} as const
export const FLOWDOC_LIVE_DRAFT_MR1_MULTILINE_PAGE = {
  widthPt: 595.28,
  heightPt: 841.89,
  clip: { xPt: 72, yPt: 72, widthPt: 120, heightPt: 250 },
} as const

export function createFlowDocLiveDraftMr1MultiLineLayoutInputV1(options: {
  detailSuffix?: string
  instanceRevision?: number
  layoutId?: string
} = {}): FlowDocTextEngineMultiRunLayoutInputV1 {
  const pieces = [
    { inlineId: "intro", kind: "text" as const, renderedText: "FlowDoc preview " },
    {
      inlineId: "bold-thai",
      kind: "text" as const,
      renderedText: "ข้อความตัวหนา",
      localStyle: { fontSize: { value: 24, unit: "pt" as const }, fontWeight: "bold" as const },
    },
    { inlineId: "separator", kind: "text" as const, renderedText: " / " },
    {
      inlineId: "customer-field",
      kind: "resolved-field" as const,
      fieldKey: "customer.displayName",
      renderedText: "ลูกค้าเอซีเอ็มอี",
    },
    {
      inlineId: "detail",
      kind: "text" as const,
      renderedText: ` รายงานฉบับทดสอบหลายบรรทัด${options.detailSuffix ?? ""}`,
      localStyle: { fontSize: { value: 10, unit: "pt" as const } },
    },
  ]
  let offset = 0
  const runs = pieces.map((piece) => {
    const renderStartOffset = offset
    offset += piece.renderedText.length
    return {
      ...piece,
      renderStartOffset,
      renderEndOffset: offset,
      styleKey: "paragraph-body",
    }
  })
  const renderedText = pieces.map((piece) => piece.renderedText).join("")
  return {
    layoutId: options.layoutId ?? "live-draft-mr1-real-browser-multiline",
    measurement: {
      documentId: "live-draft-mr1-real-browser-document",
      instanceRevision: options.instanceRevision ?? 2,
      sectionId: "section-main",
      textBlockId: "text-block-multiline-multi-glyph",
      availableWidthPt: 120,
      measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
      styleKey: "paragraph-body",
      renderedText,
      runs,
    },
    declaredLineHeightLayoutUnit: 18_000_000,
    paragraphStyle: {
      styleKey: "paragraph-body",
      runStyle: {
        fontFamilyKey: "sarabun",
        fontSize: { value: 12, unit: "pt" },
        textColor: "202020",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        strikethrough: false,
      },
    },
    fontFaces: FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1.map((face) => structuredClone(face)),
  }
}
