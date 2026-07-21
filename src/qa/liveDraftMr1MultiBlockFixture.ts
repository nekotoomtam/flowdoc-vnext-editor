import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1,
  type FlowDocTextEngineMultiRunLayoutInputV1,
} from "@flowdoc/text-engine-rust-wasm"
import type { FlowDocLiveDraftMultiBlockReadyInputV1 } from "../editor/liveDraft/liveDraftMultiBlockController"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"

export const FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID = "text-block-05-active" as const
export const FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_PAGE_GEOMETRY = {
  widthLayoutUnit: 210_000_000,
  heightLayoutUnit: 220_000_000,
  bodyXLayoutUnit: 30_000_000,
  bodyYLayoutUnit: 30_000_000,
  bodyWidthLayoutUnit: 150_000_000,
  bodyHeightLayoutUnit: 160_000_000,
} as const
export const FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_GAP_LAYOUT_UNIT = 6_000_000 as const

export type FlowDocLiveDraftMr1MultiBlockVariantV1 = "initial" | "expanded" | "short-change"

function activePieces(variant: FlowDocLiveDraftMr1MultiBlockVariantV1) {
  const suffix = variant === "expanded"
    ? " ข้อความทดสอบการพิมพ์แบบต่อเนื่อง บรรทัดจะเคลื่อนไปยังหน้าใหม่ แล้วส่วนถัดไปต้องจัดตำแหน่งตามอย่างถูกต้อง ข้อความยาวนี้ตั้งใจให้เกิดหลายบรรทัด"
    : variant === "short-change" ? " ใหม่" : ""
  return [{
    inlineId: "active-intro",
    kind: "text" as const,
    renderedText: "เอกสาร ",
  }, {
    inlineId: "active-bold",
    kind: "text" as const,
    renderedText: "สด",
    localStyle: { fontSize: { value: 24, unit: "pt" as const }, fontWeight: "bold" as const },
  }, {
    inlineId: "active-field",
    kind: "resolved-field" as const,
    fieldKey: "customer.initial",
    renderedText: " A",
  }, {
    inlineId: "active-detail",
    kind: "text" as const,
    renderedText: suffix,
  }]
}

function createBlockLayout(input: {
  blockIndex: number
  blockRevision: number
  variant: FlowDocLiveDraftMr1MultiBlockVariantV1
}): FlowDocTextEngineMultiRunLayoutInputV1 {
  const textBlockId = input.blockIndex === 5
    ? FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID
    : `text-block-${String(input.blockIndex).padStart(2, "0")}`
  const pieces = input.blockIndex === 5
    ? activePieces(input.variant)
    : [{ inlineId: `inline-${input.blockIndex}`, kind: "text" as const, renderedText: `บล็อก ${input.blockIndex + 1}` }]
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
  return {
    layoutId: `live-draft-mr1-multi-block:${textBlockId}:r${input.blockRevision}:${input.variant}`,
    measurement: {
      documentId: "live-draft-mr1-multi-block-document",
      instanceRevision: input.blockRevision,
      sectionId: "section-main",
      textBlockId,
      availableWidthPt: 150,
      measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
      styleKey: "paragraph-body",
      renderedText: pieces.map((piece) => piece.renderedText).join(""),
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

export function createFlowDocLiveDraftMr1MultiBlockInputV1(options: {
  documentRevision: number
  variant: FlowDocLiveDraftMr1MultiBlockVariantV1
}): FlowDocLiveDraftMultiBlockReadyInputV1 {
  const blocks = Array.from({ length: 12 }, (_, blockIndex) => {
    const active = blockIndex === 5
    const blockRevision = active ? options.documentRevision : 1
    return {
      textBlockId: active
        ? FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_ACTIVE_ID
        : `text-block-${String(blockIndex).padStart(2, "0")}`,
      contentFingerprint: active
        ? `active:${options.variant}:r${options.documentRevision}`
        : `static:${blockIndex}:v1`,
      layout: createBlockLayout({ blockIndex, blockRevision, variant: active ? options.variant : "initial" }),
      visibility: active
        ? "active" as const
        : blockIndex === 4 || blockIndex === 6
          ? "visible" as const
          : blockIndex === 3 || blockIndex === 7 ? "near-viewport" as const : "offscreen" as const,
      nearLineEdge: active,
      nearPageEdge: active,
    }
  })
  return {
    status: "ready",
    documentId: "live-draft-mr1-multi-block-document",
    documentRevision: options.documentRevision,
    contentFingerprint: `document:${options.variant}:r${options.documentRevision}`,
    compositionId: `multi-block-composition:r${options.documentRevision}`,
    projectionId: `multi-block-projection:r${options.documentRevision}`,
    pageGeometry: structuredClone(FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_PAGE_GEOMETRY),
    blockGapLayoutUnit: FLOWDOC_LIVE_DRAFT_MR1_MULTI_BLOCK_GAP_LAYOUT_UNIT,
    blocks,
  }
}
