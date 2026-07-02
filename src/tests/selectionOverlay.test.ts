import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  areSelectionOverlayRectsEqual,
  createSelectionOverlayRect,
} from "../editor/selection/selectionOverlay"

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const projectRoot = dirname(repoRoot)

function readSource(...segments: string[]): string {
  return readFileSync(join(projectRoot, ...segments), "utf8")
}

describe("selection overlay geometry", () => {
  it("projects selected node bounds into canvas-stage coordinates", () => {
    expect(createSelectionOverlayRect({
      nodeBounds: {
        bottom: 260.331,
        left: 160.221,
        right: 481.456,
        top: 128.114,
      },
      nodeId: "detail-table",
      stageBounds: {
        bottom: 900,
        left: 120.111,
        right: 900,
        top: 84.001,
      },
    })).toEqual({
      height: 132.22,
      left: 40.11,
      nodeId: "detail-table",
      top: 44.11,
      width: 321.24,
    })
  })

  it("keeps overlay coordinates stable when scroll moves the stage and node together", () => {
    const beforeScroll = createSelectionOverlayRect({
      nodeBounds: {
        bottom: 420,
        left: 220,
        right: 560,
        top: 320,
      },
      nodeId: "detail-table",
      stageBounds: {
        bottom: 1200,
        left: 160,
        right: 900,
        top: 120,
      },
    })
    const afterScroll = createSelectionOverlayRect({
      nodeBounds: {
        bottom: 120,
        left: 220,
        right: 560,
        top: 20,
      },
      nodeId: "detail-table",
      stageBounds: {
        bottom: 900,
        left: 160,
        right: 900,
        top: -180,
      },
    })

    expect(afterScroll).toEqual(beforeScroll)
  })

  it("rejects empty, invalid, and zero-size overlay bounds", () => {
    const stageBounds = { bottom: 600, left: 10, right: 500, top: 20 }
    const nodeBounds = { bottom: 140, left: 80, right: 220, top: 100 }

    expect(createSelectionOverlayRect({
      nodeBounds,
      nodeId: "   ",
      stageBounds,
    })).toBeNull()
    expect(createSelectionOverlayRect({
      nodeBounds: { ...nodeBounds, right: 80 },
      nodeId: "node",
      stageBounds,
    })).toBeNull()
    expect(createSelectionOverlayRect({
      nodeBounds: { ...nodeBounds, top: Number.NaN },
      nodeId: "node",
      stageBounds,
    })).toBeNull()
  })

  it("compares overlay rects by value so repeated measurements stay stable", () => {
    const rect = {
      height: 40,
      left: 24,
      nodeId: "detail-table",
      top: 88,
      width: 320,
    }

    expect(areSelectionOverlayRectsEqual(rect, { ...rect })).toBe(true)
    expect(areSelectionOverlayRectsEqual(rect, { ...rect, top: 89 })).toBe(false)
    expect(areSelectionOverlayRectsEqual(rect, null)).toBe(false)
    expect(areSelectionOverlayRectsEqual(null, null)).toBe(true)
  })

  it("keeps the canvas overlay as a read-only pointer-free measurement layer", () => {
    const overlaySource = readSource("src", "components", "canvas", "CanvasOverlayLayer.tsx")
    const stageSource = readSource("src", "components", "canvas", "CanvasStage.tsx")
    const editorCss = readSource("src", "styles", "editor.css")

    expect(overlaySource).toContain("createSelectionOverlayRect")
    expect(overlaySource).toContain("getBoundingClientRect")
    expect(overlaySource).toContain(".paper-block[data-node-id]")
    expect(overlaySource).not.toContain("onClick")
    expect(stageSource).toContain("stageRef={stageRef}")
    expect(editorCss).toContain(".canvas-selection-outline")
    expect(editorCss).toContain("pointer-events: none")
  })
})
