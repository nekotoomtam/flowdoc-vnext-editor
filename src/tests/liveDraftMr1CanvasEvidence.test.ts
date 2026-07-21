import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface CanvasEvidenceV1 {
  evidenceId: string
  status: string
  execution: Record<string, boolean | number>
  identity: { displayListFingerprint: string; fontSha256ById: Record<string, string> }
  parity: {
    layoutExact: boolean
    displayListExact: boolean
    layoutMaximumIntegerDrift: number
    displayListMaximumIntegerDrift: number
    nodeLayoutSha256: string
    browserLayoutSha256: string
    nodeDisplayListSha256: string
    browserDisplayListSha256: string
  }
  outcome: {
    lineCount: number
    commandCount: number
    nonBlankCommandCount: number
    commandFontFaceIds: string[]
    commandFontSizesLayoutUnit: number[]
    commandFontWeights: number[]
    baselineXLayoutUnits: number[]
    baselineYLayoutUnits: number[]
    fieldRetainedInCommand: boolean
    fontReadiness: { family: string; regular400: boolean; bold700: boolean }
    canvasWidthPx: number
    canvasHeightPx: number
    nonWhitePixelCount: number
    pngSha256: string
  }
  timing: Record<string, boolean | number>
  scope: Record<string, boolean>
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Live Draft MR1 real Chrome multi-run Canvas evidence", () => {
  it("retains exact fragment commands and a nonblank mixed-size Canvas", () => {
    const evidence = JSON.parse(read(
      "src/fixtures/live-draft-mr1-multi-run-canvas-paint.v1.json",
    )) as CanvasEvidenceV1
    expect(evidence).toMatchObject({
      evidenceId: "live-draft-mr1-multi-run-canvas-paint-v1",
      status: "accepted-bounded-multi-run-canvas-paint",
      execution: {
        nodeNativeLayout: true,
        realChromeWorkerLayout: true,
        coreFragmentDisplayListProjection: true,
        realChromeCanvasPaint: true,
        rendererMeasuredText: false,
        rendererRelayout: false,
        editorProductBinding: false,
        productionBinding: false,
        backendRequestCount: 0,
      },
      parity: {
        layoutExact: true,
        displayListExact: true,
        layoutMaximumIntegerDrift: 0,
        displayListMaximumIntegerDrift: 0,
      },
      outcome: {
        lineCount: 1,
        commandCount: 3,
        nonBlankCommandCount: 3,
        commandFontFaceIds: ["sarabun-regular", "sarabun-bold", "sarabun-regular"],
        commandFontSizesLayoutUnit: [10_000_000, 24_000_000, 12_000_000],
        commandFontWeights: [400, 700, 400],
        baselineXLayoutUnits: [72_000_000, 77_960_000, 92_504_000],
        baselineYLayoutUnits: [97_632_000],
        fieldRetainedInCommand: true,
        fontReadiness: { family: "Sarabun", regular400: true, bold700: true },
        canvasWidthPx: 794,
        canvasHeightPx: 1_123,
        nonWhitePixelCount: 2_589,
        pngSha256: "b765e0fa3e4b8bdc21fbdf6f114d99bf051e38214810e83a95e0a36f6f100882",
      },
      scope: {
        oneTextBlock: true,
        mixedSizeOneLine: true,
        realBrowserWorkerParity: true,
        coreFragmentDisplayList: true,
        qaCanvasPaint: true,
        productCanvasBinding: false,
        backendBinding: false,
        defaultMeasurerReplacement: false,
        wholeDocumentComposition: false,
        productionBinding: false,
        glyphPixelParity: false,
      },
    })
    expect(evidence.parity.nodeLayoutSha256).toBe(evidence.parity.browserLayoutSha256)
    expect(evidence.parity.nodeDisplayListSha256).toBe(evidence.parity.browserDisplayListSha256)
    expect(evidence.identity.displayListFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(evidence.identity.fontSha256ById).toHaveProperty("sarabun-bold")
    expect(evidence.timing.observationalNoBudget).toBe(true)
    expect(evidence.timing.projectionDurationMs).toBeGreaterThanOrEqual(0)
    expect(evidence.timing.paintDurationMs).toBeGreaterThanOrEqual(0)
  })

  it("keeps the Canvas lane QA-only and behind the Core adapter", () => {
    const page = read("src/qa/liveDraftMr1CanvasEvidencePage.ts")
    const painter = read("src/editor/liveDraft/liveDraftMultiRunCanvasPainter.ts")
    const fonts = read("src/editor/liveDraft/liveDraftMultiRunCanvasFont.ts")
    const adapter = read("src/core/coreAdapter.ts")
    const runner = read("scripts/run-live-draft-mr1-evidence.mjs")
    const doc = read("docs/LIVE_DRAFT_MR1_CANVAS_PAINT.md")

    expect(page).toContain("projectCoreLiveDraftMultiRunDisplayListV1")
    expect(page).not.toContain("@flowdoc/vnext-core")
    expect(painter).toContain("fillText")
    expect(painter).not.toContain("measureText")
    expect(painter).not.toMatch(/breakText|wrapText|layoutText/u)
    expect(fonts).toContain("new FontFace")
    expect(fonts).toContain('weight: "400"')
    expect(fonts).toContain('weight: "700"')
    expect(adapter).toContain("projectVNextTextBlockMultiRunDisplayListV1")
    expect(runner).toContain("nonWhitePixelCount")
    expect(runner).toContain("canvasBackendLikeRequests")
    expect(doc).toContain("does not prove that Canvas glyph")
    expect(doc).toContain("not accepted budgets")
  })
})
