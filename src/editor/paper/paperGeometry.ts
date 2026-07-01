import type { PaperModel } from "./paperModel"

export interface PaperBounds {
  height: number
  width: number
}

export function getPaperBounds(model: PaperModel): PaperBounds {
  return {
    height: model.heightPx * model.zoom,
    width: model.widthPx * model.zoom,
  }
}
