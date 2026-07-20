import { FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL } from "@flowdoc/text-engine-rust-wasm/browser-assets"

export const FLOWDOC_LIVE_DRAFT_CANVAS_FONT_FAMILY = "FlowDoc Live Draft Sarabun" as const

let loadedFont: Promise<void> | null = null

export function ensureFlowDocLiveDraftCanvasFontV1(): Promise<void> {
  loadedFont ??= (async () => {
    const face = new FontFace(
      FLOWDOC_LIVE_DRAFT_CANVAS_FONT_FAMILY,
      `url(${FLOWDOC_TEXT_ENGINE_LIVE_DRAFT_SARABUN_REGULAR_URL})`,
      { style: "normal", weight: "400" },
    )
    const ready = await face.load()
    document.fonts.add(ready)
    await document.fonts.load(`12pt "${FLOWDOC_LIVE_DRAFT_CANVAS_FONT_FAMILY}"`)
  })()
  return loadedFont
}
