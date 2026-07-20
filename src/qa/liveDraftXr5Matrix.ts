import type {
  CoreLiveDraftMeasurementRunV1,
  CoreLiveDraftTextFlowDisplayListInputV1,
} from "../core/coreAdapter"

export const FLOWDOC_LIVE_DRAFT_XR5_CROSS_RUNTIME_DRIFT_POLICY_V1 = {
  policyId: "live-draft-xr5-cross-runtime-drift-policy-v1",
  numericPointMaxAbsDrift: 0.000001,
  numericEngineFactMaxAbsDrift: 0,
  breakOffsets: "exact",
  lineAndPageCounts: "exact",
  sourceSegments: "exact",
  deterministicFingerprints: "exact",
  mismatchDisposition: "blocked",
} as const

export const FLOWDOC_LIVE_DRAFT_XR5_SAMPLE_COUNT = {
  coldPerRow: 1,
  warmPerRow: 1,
} as const

export interface FlowDocLiveDraftXr5MatrixRowV1 {
  rowId: string
  fixtureId: string
  scenarioId: string
  coverage: "mixed-script" | "style-font-map" | "field-adjacency" | "width-pair" | "forced-line-break" | "long-block"
  text: string
  fontId: "sarabun-regular" | "sarabun-bold"
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf" | "assets/fonts/Sarabun/Sarabun-Bold.ttf"
  fontSha256: string
  availableWidthPt: number
  fontSizePt: number
  lineHeightPt: number
  pageBodyHeightPt: number
  styleKey: string
  sourceRuns?: CoreLiveDraftMeasurementRunV1[]
  displayList: CoreLiveDraftTextFlowDisplayListInputV1
  expected: {
    minimumLineCount: number
    minimumPageCount: number
    requiresMixedThaiLatin?: true
    requiredFieldKey?: string
    requiredFontId?: "sarabun-regular" | "sarabun-bold"
    requiresHardBreakSegment?: true
  }
}

export interface FlowDocLiveDraftXr5BlockedMatrixRowV1 {
  rowId: string
  fixtureId: string
  scenarioId: string
  status: "blocked"
  blockerCodes: string[]
  missingFacts: string[]
  reason: string
}

const sarabunRegular = {
  fontId: "sarabun-regular",
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Regular.ttf",
  fontSha256: "b8150084e25734e6f31696c57ff009f5564efa09d295848b717d9e2328c0311d",
} as const

const sarabunBold = {
  fontId: "sarabun-bold",
  fontAssetPath: "assets/fonts/Sarabun/Sarabun-Bold.ttf",
  fontSha256: "5d1fc1ee63ab861fb2022a212b5ff270848582bb9d9cba73b2d2aaabb16d0a18",
} as const

function displayList(input: {
  rowId: string
  availableWidthPt: number
  fontId: "sarabun-regular" | "sarabun-bold"
  fontSizePt: number
}): CoreLiveDraftTextFlowDisplayListInputV1 {
  return {
    projectionId: `live-draft-xr5:${input.rowId}`,
    pageWidthPt: Math.max(595.28, input.availableWidthPt + 144),
    pageHeightPt: 841.89,
    bodyXPt: 72,
    bodyYPt: 72,
    fontId: input.fontId,
    fontFamily: "Sarabun",
    fontSizePt: input.fontSizePt,
    baselineOffsetPt: input.fontSizePt * 1.125,
    color: "172033",
  }
}

function sourceRuns(input: Array<{
  inlineId: string
  kind: "text" | "resolved-field" | "hard-break"
  text: string
  fieldKey?: string
  styleKey?: string
}>): CoreLiveDraftMeasurementRunV1[] {
  let offset = 0
  return input.map((part) => {
    const renderStartOffset = offset
    offset += part.text.length
    return {
      inlineId: part.inlineId,
      kind: part.kind,
      renderedText: part.text,
      renderStartOffset,
      renderEndOffset: offset,
      ...(part.fieldKey == null ? {} : { fieldKey: part.fieldKey }),
      ...(part.styleKey == null ? {} : { styleKey: part.styleKey }),
    }
  })
}

const mixedReportTitle = "รายงานยอดขาย Q2 2026"
const mixedProductName = "FlowDoc วัดข้อความไทยให้ตรง PDF"
const mixedUnit = `สวัสดีครับตูม Prepared summary`
const longMixedText = Array.from({ length: 160 }, () => mixedUnit).join(" ")
const fieldParts = [{
  inlineId: "field-adjacency-before",
  kind: "text" as const,
  text: "ลูกค้า ",
  styleKey: "paragraph",
}, {
  inlineId: "field-adjacency-customer-name",
  kind: "resolved-field" as const,
  fieldKey: "customer.name",
  text: "บริษัทโฟลว์ด็อก จำกัด",
  styleKey: "paragraph",
}, {
  inlineId: "field-adjacency-after",
  kind: "text" as const,
  text: " พร้อมใช้งาน",
  styleKey: "paragraph",
}]
const forcedBreakParts = [{
  inlineId: "forced-line-1",
  kind: "text" as const,
  text: "บรรทัดแรก FlowDoc",
  styleKey: "paragraph",
}, {
  inlineId: "forced-break-1",
  kind: "hard-break" as const,
  text: "\n",
}, {
  inlineId: "forced-line-2",
  kind: "text" as const,
  text: "Second line ภาษาไทย",
  styleKey: "paragraph",
}, {
  inlineId: "forced-break-2",
  kind: "hard-break" as const,
  text: "\n",
}, {
  inlineId: "forced-line-3",
  kind: "text" as const,
  text: "บรรทัดสุดท้าย",
  styleKey: "paragraph",
}]

const row = (
  input: Omit<FlowDocLiveDraftXr5MatrixRowV1, "displayList">,
): FlowDocLiveDraftXr5MatrixRowV1 => ({
  ...input,
  displayList: displayList({
    rowId: input.rowId,
    availableWidthPt: input.availableWidthPt,
    fontId: input.fontId,
    fontSizePt: input.fontSizePt,
  }),
})

export const FLOWDOC_LIVE_DRAFT_XR5_MATRIX_ROWS_V1 = [
  row({
    rowId: "live-draft-xr5-mixed-report-title",
    fixtureId: "v1-measure-mixed-latin-thai-title",
    scenarioId: "mixed-report-title",
    coverage: "mixed-script",
    text: mixedReportTitle,
    ...sarabunBold,
    availableWidthPt: 180,
    fontSizePt: 20,
    lineHeightPt: 28,
    pageBodyHeightPt: 280,
    styleKey: "heading-xl",
    expected: { minimumLineCount: 1, minimumPageCount: 1, requiresMixedThaiLatin: true, requiredFontId: "sarabun-bold" },
  }),
  row({
    rowId: "live-draft-xr5-mixed-product-name",
    fixtureId: "v1-measure-mixed-latin-thai-title",
    scenarioId: "mixed-product-name",
    coverage: "mixed-script",
    text: mixedProductName,
    ...sarabunRegular,
    availableWidthPt: 144,
    fontSizePt: 12,
    lineHeightPt: 18,
    pageBodyHeightPt: 252,
    styleKey: "paragraph",
    expected: { minimumLineCount: 2, minimumPageCount: 1, requiresMixedThaiLatin: true, requiredFontId: "sarabun-regular" },
  }),
  row({
    rowId: "live-draft-xr5-style-paragraph-regular",
    fixtureId: "v1-measure-styled-inline-font-map",
    scenarioId: "shape-thai-greeting-sarabun-regular",
    coverage: "style-font-map",
    text: "สวัสดีครับตูม",
    ...sarabunRegular,
    availableWidthPt: 144,
    fontSizePt: 12,
    lineHeightPt: 18,
    pageBodyHeightPt: 252,
    styleKey: "paragraph",
    expected: { minimumLineCount: 1, minimumPageCount: 1, requiredFontId: "sarabun-regular" },
  }),
  row({
    rowId: "live-draft-xr5-style-heading-bold",
    fixtureId: "v1-measure-styled-inline-font-map",
    scenarioId: "shape-mixed-heading-sarabun-bold",
    coverage: "style-font-map",
    text: mixedReportTitle,
    ...sarabunBold,
    availableWidthPt: 160,
    fontSizePt: 20,
    lineHeightPt: 28,
    pageBodyHeightPt: 280,
    styleKey: "heading-xl",
    expected: { minimumLineCount: 1, minimumPageCount: 1, requiredFontId: "sarabun-bold" },
  }),
  row({
    rowId: "live-draft-xr5-field-chip-adjacency",
    fixtureId: "v1-measure-field-chip-adjacency",
    scenarioId: "rich-inline-field-chip-adjacency",
    coverage: "field-adjacency",
    text: fieldParts.map((part) => part.text).join(""),
    ...sarabunRegular,
    availableWidthPt: 144,
    fontSizePt: 12,
    lineHeightPt: 18,
    pageBodyHeightPt: 252,
    styleKey: "paragraph",
    sourceRuns: sourceRuns(fieldParts),
    expected: { minimumLineCount: 2, minimumPageCount: 1, requiredFieldKey: "customer.name" },
  }),
  row({
    rowId: "live-draft-xr5-width-narrow-24pt",
    fixtureId: "v1-measure-width-narrow-wide-pair",
    scenarioId: "line-wrap-narrow-24pt",
    coverage: "width-pair",
    text: mixedProductName,
    ...sarabunRegular,
    availableWidthPt: 24,
    fontSizePt: 6,
    lineHeightPt: 9,
    pageBodyHeightPt: 126,
    styleKey: "paragraph/width-pair",
    expected: { minimumLineCount: 3, minimumPageCount: 1 },
  }),
  row({
    rowId: "live-draft-xr5-width-wide-10000pt",
    fixtureId: "v1-measure-width-narrow-wide-pair",
    scenarioId: "line-wrap-wide-10000pt",
    coverage: "width-pair",
    text: mixedProductName,
    ...sarabunRegular,
    availableWidthPt: 10_000,
    fontSizePt: 6,
    lineHeightPt: 9,
    pageBodyHeightPt: 126,
    styleKey: "paragraph/width-pair",
    expected: { minimumLineCount: 1, minimumPageCount: 1 },
  }),
  row({
    rowId: "live-draft-xr5-forced-line-break",
    fixtureId: "v1-measure-multiline-forced-break",
    scenarioId: "forced-line-break-planned",
    coverage: "forced-line-break",
    text: forcedBreakParts.map((part) => part.text).join(""),
    ...sarabunRegular,
    availableWidthPt: 180,
    fontSizePt: 12,
    lineHeightPt: 18,
    pageBodyHeightPt: 252,
    styleKey: "paragraph",
    sourceRuns: sourceRuns(forcedBreakParts),
    expected: { minimumLineCount: 3, minimumPageCount: 1, requiresHardBreakSegment: true },
  }),
  row({
    rowId: "live-draft-xr5-large-document-long-block",
    fixtureId: "v1-measure-large-document-long-block",
    scenarioId: "large-document-long-body-block",
    coverage: "long-block",
    text: longMixedText,
    ...sarabunRegular,
    availableWidthPt: 240,
    fontSizePt: 12,
    lineHeightPt: 18,
    pageBodyHeightPt: 252,
    styleKey: "paragraph",
    expected: { minimumLineCount: 100, minimumPageCount: 8 },
  }),
] as const satisfies readonly FlowDocLiveDraftXr5MatrixRowV1[]

export const FLOWDOC_LIVE_DRAFT_XR5_BLOCKED_ROWS_V1 = [{
  rowId: "live-draft-xr5-blocked-mixed-font-inline-run",
  fixtureId: "v1-measure-styled-inline-font-map",
  scenarioId: "rich-inline-mixed-font-switch",
  status: "blocked",
  blockerCodes: ["multi-font-inline-shaping-not-implemented", "per-run-paint-geometry-not-implemented"],
  missingFacts: ["multi-font-glyph-facts", "per-run-line-geometry", "styled-display-list-commands"],
  reason: "XR5 proves deterministic style-to-font rows, but one line still cannot switch font faces inside the same measurement request.",
}, {
  rowId: "live-draft-xr5-blocked-table-cell-constrained",
  fixtureId: "v1-measure-table-cell-constrained",
  scenarioId: "product-report-table-cell-text",
  status: "blocked",
  blockerCodes: ["table-cell-composition-not-bound"],
  missingFacts: ["cell-width-owner", "table-cell-display-list", "synchronized-row-pagination"],
  reason: "The one-block XR5 matrix does not impersonate the accepted Table preparation and synchronized pagination contracts.",
}, {
  rowId: "live-draft-xr5-blocked-repeated-header-table-lines",
  fixtureId: "v1-measure-repeated-header-table-lines",
  scenarioId: "table-repeat-header-lines",
  status: "blocked",
  blockerCodes: ["repeated-header-composition-not-bound"],
  missingFacts: ["header-repeat-owner", "continuation-page-table-commands", "header-border-ownership"],
  reason: "Repeated headers require the Table page/display-list lane, not a fabricated text-block row.",
}, {
  rowId: "live-draft-xr5-blocked-forced-page-break",
  fixtureId: "v1-measure-multiline-forced-break",
  scenarioId: "forced-page-break",
  status: "blocked",
  blockerCodes: ["explicit-page-break-not-in-one-block-text-flow"],
  missingFacts: ["mixed-document-composition", "page-break-command-owner"],
  reason: "Hard line breaks are covered; explicit page-break nodes remain a mixed-document composition concern.",
}, {
  rowId: "live-draft-xr5-blocked-approximate-renderer-drift",
  fixtureId: "v1-measure-renderer-backed-drift-summary",
  scenarioId: "phase-135-renderer-backed-provider-drift",
  status: "blocked",
  blockerCodes: ["approximate-vs-renderer-drift-not-evaluated-in-xr5"],
  missingFacts: ["approximate-draft-summary", "accepted-threshold-evaluation"],
  reason: "XR5 records Node/Browser renderer-backed drift; it does not relabel that as default/approximate measurer drift.",
}] as const satisfies readonly FlowDocLiveDraftXr5BlockedMatrixRowV1[]
