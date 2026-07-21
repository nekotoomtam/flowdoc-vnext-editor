import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1,
  type FlowDocTextEngineMultiRunLayoutInputV1,
} from "@flowdoc/text-engine-rust-wasm"

export const FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID =
  "measurement-profile-mr1-real-browser-v1" as const

export function createFlowDocLiveDraftMr1LayoutInputV1(): FlowDocTextEngineMultiRunLayoutInputV1 {
  return {
    layoutId: "live-draft-mr1-real-browser-mixed-line",
    measurement: {
      documentId: "live-draft-mr1-real-browser-document",
      instanceRevision: 1,
      sectionId: "section-main",
      textBlockId: "text-block-mixed-size",
      availableWidthPt: 100,
      measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
      styleKey: "paragraph-body",
      renderedText: "ABC",
      runs: [
        {
          inlineId: "regular-a",
          kind: "text",
          renderStartOffset: 0,
          renderEndOffset: 1,
          renderedText: "A",
          styleKey: "paragraph-body",
          localStyle: { fontSize: { value: 10, unit: "pt" } },
        },
        {
          inlineId: "bold-b",
          kind: "text",
          renderStartOffset: 1,
          renderEndOffset: 2,
          renderedText: "B",
          styleKey: "paragraph-body",
          localStyle: { fontSize: { value: 24, unit: "pt" }, fontWeight: "bold" },
        },
        {
          inlineId: "field-c",
          kind: "resolved-field",
          fieldKey: "customer.initial",
          renderStartOffset: 2,
          renderEndOffset: 3,
          renderedText: "C",
          styleKey: "paragraph-body",
        },
      ],
    },
    declaredLineHeightLayoutUnit: 14_000_000,
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
