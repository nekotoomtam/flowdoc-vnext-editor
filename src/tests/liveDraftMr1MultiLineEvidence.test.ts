import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface DistributionV1 {
  sampleCount: number
  minMs: number
  p50Ms: number
  p95Ms: number
  maxMs: number
}

interface MultiLineEvidenceV1 {
  evidenceId: string
  status: string
  execution: Record<string, boolean | number>
  identity: {
    layoutFingerprint: string
    displayListFingerprint: string
    fontSha256ById: Record<string, string>
  }
  parity: {
    requestExact: boolean
    layoutExact: boolean
    displayListExact: boolean
    requestMaximumIntegerDrift: number
    layoutMaximumIntegerDrift: number
    displayListMaximumIntegerDrift: number
    nodeRequestSha256: string
    browserRequestSha256: string
    nodeLayoutSha256: string
    browserLayoutSha256: string
    nodeDisplayListSha256: string
    browserDisplayListSha256: string
  }
  outcome: {
    renderedTextUtf16Length: number
    shapingRunCount: number
    clusterCount: number
    lineCount: number
    commandCount: number
    nonBlankCommandCount: number
    commandTexts: string[]
    commandLineIndexes: number[]
    baselineYLayoutUnits: number[]
    commandFontFaceIds: string[]
    commandFontSizesLayoutUnit: number[]
    commandFontWeights: number[]
    allCommandsMultiGlyph: boolean
    shapingRunSplitAcrossLines: boolean
    fieldRetainedInCommand: boolean
    nonWhitePixelCount: number
    pngSha256: string
  }
  timing: {
    observationalNoBudget: boolean
    warmLayout: DistributionV1
    warmProjection: DistributionV1
    warmPaint: DistributionV1
    samplesConsistent: boolean
  }
  scope: Record<string, boolean>
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function expectOrderedDistribution(value: DistributionV1): void {
  expect(value.sampleCount).toBe(25)
  expect(value.minMs).toBeLessThanOrEqual(value.p50Ms)
  expect(value.p50Ms).toBeLessThanOrEqual(value.p95Ms)
  expect(value.p95Ms).toBeLessThanOrEqual(value.maxMs)
}

describe("Live Draft MR1 multi-line multi-glyph Canvas evidence", () => {
  it("retains exact Node/Chrome/Core facts for wrapped mixed styles", () => {
    const evidence = JSON.parse(read(
      "src/fixtures/live-draft-mr1-multiline-multi-glyph-canvas.v1.json",
    )) as MultiLineEvidenceV1

    expect(evidence).toMatchObject({
      evidenceId: "live-draft-mr1-multiline-multi-glyph-canvas-v1",
      status: "accepted-bounded-multiline-multi-glyph-canvas",
      execution: {
        nodeNativeLayout: true,
        realChromeWorkerLayout: true,
        coreFragmentDisplayListProjection: true,
        realChromeCanvasPaint: true,
        workerWarmSampleCount: 25,
        projectionWarmSampleCount: 25,
        paintWarmSampleCount: 25,
        rendererMeasuredText: false,
        rendererRelayout: false,
        editorProductBinding: false,
        productionBinding: false,
        backendRequestCount: 0,
      },
      parity: {
        requestExact: true,
        layoutExact: true,
        displayListExact: true,
        requestMaximumIntegerDrift: 0,
        layoutMaximumIntegerDrift: 0,
        displayListMaximumIntegerDrift: 0,
      },
      outcome: {
        renderedTextUtf16Length: 74,
        shapingRunCount: 4,
        clusterCount: 65,
        lineCount: 5,
        commandCount: 8,
        nonBlankCommandCount: 8,
        commandTexts: [
          "FlowDoc preview ", "ข้อ", "ความ", "ตัวหนา", " / ลูกค้า",
          "เอซีเอ็มอี", " รายงานฉบับ", "ทดสอบหลายบรรทัด",
        ],
        commandLineIndexes: [0, 0, 1, 2, 2, 3, 3, 4],
        baselineYLayoutUnits: [97_632_000, 128_832_000, 160_032_000, 179_616_000, 196_780_000],
        commandFontFaceIds: ["sarabun-regular", "sarabun-bold"],
        commandFontSizesLayoutUnit: [10_000_000, 12_000_000, 24_000_000],
        commandFontWeights: [400, 700],
        allCommandsMultiGlyph: true,
        shapingRunSplitAcrossLines: true,
        fieldRetainedInCommand: true,
        nonWhitePixelCount: 10_094,
        pngSha256: "3a456a4265e180d1b51fc0eac682dadcea416304f72c04386d2bf86be741cd7a",
      },
      scope: {
        oneTextBlock: true,
        mixedSizeMultiLine: true,
        multiGlyphCommands: true,
        shapingRunSplitAcrossLines: true,
        resolvedFieldAcrossLines: true,
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
    expect(evidence.parity.nodeRequestSha256).toBe(evidence.parity.browserRequestSha256)
    expect(evidence.parity.nodeLayoutSha256).toBe(evidence.parity.browserLayoutSha256)
    expect(evidence.parity.nodeDisplayListSha256).toBe(evidence.parity.browserDisplayListSha256)
    expect(evidence.identity.layoutFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(evidence.identity.displayListFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u)
    expect(evidence.identity.fontSha256ById).toHaveProperty("sarabun-bold")
    expect(evidence.timing).toMatchObject({ observationalNoBudget: true, samplesConsistent: true })
    expectOrderedDistribution(evidence.timing.warmLayout)
    expectOrderedDistribution(evidence.timing.warmProjection)
    expectOrderedDistribution(evidence.timing.warmPaint)
  })

  it("keeps the longer fixture QA-only and the Canvas paint non-measuring", () => {
    const page = read("src/qa/liveDraftMr1MultiLineEvidencePage.ts")
    const painter = read("src/editor/liveDraft/liveDraftMultiRunCanvasPainter.ts")
    const runner = read("scripts/run-live-draft-mr1-evidence.mjs")
    const doc = read("docs/LIVE_DRAFT_MR1_MULTILINE_MULTI_GLYPH.md")

    expect(page).toContain("projectCoreLiveDraftMultiRunDisplayListV1")
    expect(page).not.toContain("@flowdoc/vnext-core")
    expect(painter).toContain("fillText")
    expect(painter).not.toContain("measureText")
    expect(painter).not.toMatch(/breakText|wrapText|layoutText/u)
    expect(runner).toContain("multiLineBackendLikeRequests")
    expect(runner).toContain("allCommandsMultiGlyph")
    expect(doc).toMatch(/not\s+accepted budgets/u)
    expect(doc).toContain("does not prove Canvas glyph")
  })
})
