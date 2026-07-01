export type PaperPreset = "A4" | "Letter"

export const PAPER_PRESET_DIMENSIONS: Record<
  PaperPreset,
  {
    heightPx: number
    label: string
    marginPx: number
    widthPx: number
  }
> = {
  A4: {
    heightPx: 1123,
    label: "A4",
    marginPx: 72,
    widthPx: 794,
  },
  Letter: {
    heightPx: 1056,
    label: "Letter",
    marginPx: 72,
    widthPx: 816,
  },
}

export interface PaperModel {
  gapPx: number
  heightPx: number
  label: string
  marginPx: number
  preset: PaperPreset
  widthPx: number
  zoom: number
}

export function clampPaperZoom(zoom: number): number {
  return Math.min(1.25, Math.max(0.5, Number(zoom.toFixed(2))))
}

export function createPaperModel(preset: PaperPreset, zoom = 0.85): PaperModel {
  const dimensions = PAPER_PRESET_DIMENSIONS[preset]

  return {
    gapPx: 28,
    heightPx: dimensions.heightPx,
    label: dimensions.label,
    marginPx: dimensions.marginPx,
    preset,
    widthPx: dimensions.widthPx,
    zoom: clampPaperZoom(zoom),
  }
}

export function createDefaultPaperModel(): PaperModel {
  return createPaperModel("A4")
}

export function setPaperPreset(model: PaperModel, preset: PaperPreset): PaperModel {
  return createPaperModel(preset, model.zoom)
}

export function setPaperZoom(model: PaperModel, zoom: number): PaperModel {
  return {
    ...model,
    zoom: clampPaperZoom(zoom),
  }
}
