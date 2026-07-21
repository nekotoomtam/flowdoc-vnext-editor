import {
  FLOWDOC_TEXT_ENGINE_MR1_SARABUN_FONT_FACES_V1,
  type FlowDocTextEngineMultiRunLayoutInputV1,
} from "@flowdoc/text-engine-rust-wasm"
import { FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID } from "./liveDraftMr1Fixture"

export const FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT = "สวัสดีครับตูม Prepared summary" as const
export const FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT = Array.from(
  { length: 160 },
  () => FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_UNIT,
).join(" ")

function splitOffsetNear(target: number): number {
  const nextSpace = FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.indexOf(" ", target)
  if (nextSpace < 0) throw new Error("long MR1 fixture split boundary is missing")
  return nextSpace + 1
}

const SPLIT_A = splitOffsetNear(1_450)
const SPLIT_B = splitOffsetNear(1_650)
const SPLIT_C = splitOffsetNear(2_350)
const SPLIT_D = splitOffsetNear(2_430)

function baseRuns(): FlowDocTextEngineMultiRunLayoutInputV1["measurement"]["runs"] {
  return [{
    inlineId: "long-regular-prefix",
    kind: "text",
    renderStartOffset: 0,
    renderEndOffset: SPLIT_A,
    renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.slice(0, SPLIT_A),
    styleKey: "paragraph-body",
  }, {
    inlineId: "long-large-bold-span",
    kind: "text",
    renderStartOffset: SPLIT_A,
    renderEndOffset: SPLIT_B,
    renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.slice(SPLIT_A, SPLIT_B),
    styleKey: "paragraph-body",
    localStyle: { fontSize: { value: 18, unit: "pt" }, fontWeight: "bold" },
  }, {
    inlineId: "long-regular-middle",
    kind: "text",
    renderStartOffset: SPLIT_B,
    renderEndOffset: SPLIT_C,
    renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.slice(SPLIT_B, SPLIT_C),
    styleKey: "paragraph-body",
  }, {
    inlineId: "long-resolved-field",
    kind: "resolved-field",
    fieldKey: "report.longSample",
    renderStartOffset: SPLIT_C,
    renderEndOffset: SPLIT_D,
    renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.slice(SPLIT_C, SPLIT_D),
    styleKey: "paragraph-body",
  }, {
    inlineId: "long-regular-suffix",
    kind: "text",
    renderStartOffset: SPLIT_D,
    renderEndOffset: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.length,
    renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT.slice(SPLIT_D),
    styleKey: "paragraph-body",
  }]
}

export function createFlowDocLiveDraftMr1LongBlockInputV1(
  instanceRevision = 1,
): FlowDocTextEngineMultiRunLayoutInputV1 {
  return {
    layoutId: "live-draft-mr1-incremental-long-block",
    measurement: {
      documentId: "live-draft-mr1-incremental-document",
      instanceRevision,
      sectionId: "section-main",
      textBlockId: "text-block-long-mixed-run",
      availableWidthPt: 240,
      measurementProfileId: FLOWDOC_LIVE_DRAFT_MR1_MEASUREMENT_PROFILE_ID,
      styleKey: "paragraph-body",
      renderedText: FLOWDOC_LIVE_DRAFT_MR1_LONG_MIXED_TEXT,
      runs: baseRuns(),
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

export function replaceFlowDocLiveDraftMr1LongBlockTextV1(input: {
  previous: FlowDocTextEngineMultiRunLayoutInputV1
  instanceRevision: number
  startOffset: number
  endOffset?: number
  insertedText: string
}): FlowDocTextEngineMultiRunLayoutInputV1 {
  const next = structuredClone(input.previous)
  const endOffset = input.endOffset ?? input.startOffset
  const previousText = input.previous.measurement.renderedText
  if (
    input.startOffset < 0
    || endOffset < input.startOffset
    || endOffset > previousText.length
    || /\r|\n/u.test(input.insertedText)
  ) throw new Error("bounded long-block replacement is invalid")
  const runIndex = input.previous.measurement.runs.findIndex((run, index, runs) => (
    run.kind !== "hard-break"
    && input.startOffset >= run.renderStartOffset
    && endOffset <= run.renderEndOffset
    && (input.startOffset < run.renderEndOffset || index === runs.length - 1)
  ))
  if (runIndex < 0) throw new Error("bounded long-block replacement must stay inside one paintable run")
  const run = next.measurement.runs[runIndex]!
  const localStart = input.startOffset - run.renderStartOffset
  const localEnd = endOffset - run.renderStartOffset
  run.renderedText = run.renderedText.slice(0, localStart) + input.insertedText + run.renderedText.slice(localEnd)
  const delta = input.insertedText.length - (endOffset - input.startOffset)
  run.renderEndOffset += delta
  for (let index = runIndex + 1; index < next.measurement.runs.length; index += 1) {
    next.measurement.runs[index]!.renderStartOffset += delta
    next.measurement.runs[index]!.renderEndOffset += delta
  }
  next.measurement.instanceRevision = input.instanceRevision
  next.measurement.renderedText = previousText.slice(0, input.startOffset)
    + input.insertedText
    + previousText.slice(endOffset)
  return next
}

export function createFlowDocLiveDraftMr1HardBreakEditV1(input: {
  previous: FlowDocTextEngineMultiRunLayoutInputV1
  instanceRevision: number
  offset: number
}): FlowDocTextEngineMultiRunLayoutInputV1 {
  const next = structuredClone(input.previous)
  const previousText = input.previous.measurement.renderedText
  if (input.offset <= 0 || input.offset >= previousText.length) throw new Error("hard-break offset is invalid")
  next.measurement.instanceRevision = input.instanceRevision
  next.measurement.renderedText = `${previousText.slice(0, input.offset)}\n${previousText.slice(input.offset)}`
  next.measurement.runs = [{
    inlineId: "hard-break-prefix",
    kind: "text",
    renderStartOffset: 0,
    renderEndOffset: input.offset,
    renderedText: previousText.slice(0, input.offset),
    styleKey: "paragraph-body",
  }, {
    inlineId: "hard-break-inserted",
    kind: "hard-break",
    renderStartOffset: input.offset,
    renderEndOffset: input.offset + 1,
    renderedText: "\n",
  }, {
    inlineId: "hard-break-suffix",
    kind: "text",
    renderStartOffset: input.offset + 1,
    renderEndOffset: next.measurement.renderedText.length,
    renderedText: previousText.slice(input.offset),
    styleKey: "paragraph-body",
  }]
  return next
}

export const FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_STYLE_BOUNDARY_OFFSET = SPLIT_A
export const FLOWDOC_LIVE_DRAFT_MR1_LONG_BLOCK_FIELD_BOUNDARY_OFFSET = SPLIT_C
