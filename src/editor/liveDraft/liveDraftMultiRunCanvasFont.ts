export const FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY = "Sarabun" as const

export interface FlowDocLiveDraftMr1CanvasFontReadinessV1 {
  family: typeof FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY
  regular400: true
  bold700: true
}

export async function ensureFlowDocLiveDraftMr1CanvasFontsV1(input: {
  regularBytes: ArrayBuffer
  boldBytes: ArrayBuffer
}): Promise<FlowDocLiveDraftMr1CanvasFontReadinessV1> {
  const regular = new FontFace(
    FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY,
    input.regularBytes,
    { style: "normal", weight: "400" },
  )
  const bold = new FontFace(
    FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY,
    input.boldBytes,
    { style: "normal", weight: "700" },
  )
  const [readyRegular, readyBold] = await Promise.all([regular.load(), bold.load()])
  document.fonts.add(readyRegular)
  document.fonts.add(readyBold)
  await Promise.all([
    document.fonts.load(`400 10pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "A"),
    document.fonts.load(`700 24pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "B"),
    document.fonts.load(`400 12pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "C"),
  ])
  if (
    !document.fonts.check(`400 10pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "A")
    || !document.fonts.check(`700 24pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "B")
    || !document.fonts.check(`400 12pt "${FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY}"`, "C")
  ) throw new Error("MR1 Canvas fonts did not become ready")
  return { family: FLOWDOC_LIVE_DRAFT_MR1_CANVAS_FONT_FAMILY, regular400: true, bold700: true }
}
