import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface Mr1EvidenceV1 {
  evidenceId: string
  status: string
  execution: Record<string, boolean | number>
  identity: {
    wasmSha256: string
    measurementProfileId: string
    workerBoundaryVersion: string
    fontSha256ById: Record<string, string>
  }
  parity: {
    requestExact: boolean
    layoutExact: boolean
    requestMaximumIntegerDrift: number
    layoutMaximumIntegerDrift: number
    requestSha256: string
    layoutSha256: string
    browserRequestSha256: string
    browserLayoutSha256: string
  }
  outcome: {
    shapingRunCount: number
    clusterCount: number
    lineCount: number
    fragmentCount: number
    fragmentFontFaceIds: string[]
    fieldRetained: boolean
    lineWidthLayoutUnit: number
    naturalAscentLayoutUnit: number
    naturalDescentLayoutUnit: number
    naturalHeightLayoutUnit: number
    baselineOffsetLayoutUnit: number
    fontSwitch: boolean
  }
  timing: {
    observationalNoBudget: boolean
    coldLayoutDurationMs: number
    warmLayout: { sampleCount: number; minMs: number; p50Ms: number; p95Ms: number; maxMs: number }
    samplesConsistent: boolean
  }
  scope: Record<string, boolean>
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Live Draft MR1 real Browser Worker evidence", () => {
  it("retains exact Node/Chrome mixed-font Core facts without widening product scope", () => {
    const evidence = JSON.parse(read(
      "src/fixtures/live-draft-mr1-real-browser-worker-parity.v1.json",
    )) as Mr1EvidenceV1

    expect(evidence).toMatchObject({
      evidenceId: "live-draft-mr1-real-browser-worker-parity-v1",
      status: "accepted-bounded-real-browser-worker-parity",
      execution: {
        nodeNativeRustybuzz: true,
        nodeNativeIcu4x: true,
        realChromeWorker: true,
        workerWasmRustybuzz: true,
        workerWasmIcu4x: true,
        coreMultiRunAcceptance: true,
        productionBinding: false,
        editorProductBinding: false,
        backendRequestCount: 0,
      },
      parity: {
        requestExact: true,
        layoutExact: true,
        requestMaximumIntegerDrift: 0,
        layoutMaximumIntegerDrift: 0,
      },
      outcome: {
        shapingRunCount: 3,
        clusterCount: 3,
        lineCount: 1,
        fragmentCount: 3,
        fragmentFontFaceIds: ["sarabun-regular", "sarabun-bold", "sarabun-regular"],
        fieldRetained: true,
        lineWidthLayoutUnit: 27_524_000,
        naturalAscentLayoutUnit: 25_632_000,
        naturalDescentLayoutUnit: 5_568_000,
        naturalHeightLayoutUnit: 31_200_000,
        baselineOffsetLayoutUnit: 25_632_000,
        fontSwitch: true,
      },
    })
    expect(evidence.identity).toMatchObject({
      wasmSha256: "cc130a7f8cef2694f8518cecb93b518eac2496fa8f4141f62ca284e6f34b0857",
      workerBoundaryVersion: "flowdoc-text-engine-wasm-live-draft-mr1-v1",
      fontSha256ById: {
        "sarabun-regular": "b8150084e25734e6f31696c57ff009f5564efa09d295848b717d9e2328c0311d",
        "sarabun-bold": "5d1fc1ee63ab861fb2022a212b5ff270848582bb9d9cba73b2d2aaabb16d0a18",
      },
    })
    expect(evidence.parity.requestSha256).toBe(evidence.parity.browserRequestSha256)
    expect(evidence.parity.layoutSha256).toBe(evidence.parity.browserLayoutSha256)
    expect(evidence.timing).toMatchObject({
      observationalNoBudget: true,
      warmLayout: { sampleCount: 25 },
      samplesConsistent: true,
    })
    expect(evidence.timing.coldLayoutDurationMs).toBeGreaterThanOrEqual(0)
    expect(evidence.timing.warmLayout.minMs).toBeLessThanOrEqual(evidence.timing.warmLayout.p50Ms)
    expect(evidence.timing.warmLayout.p50Ms).toBeLessThanOrEqual(evidence.timing.warmLayout.p95Ms)
    expect(evidence.timing.warmLayout.p95Ms).toBeLessThanOrEqual(evidence.timing.warmLayout.maxMs)
    expect(evidence.scope).toMatchObject({
      oneTextBlock: true,
      mixedSizeOneLine: true,
      realBrowserWorkerParity: true,
      displayListBinding: false,
      canvasPaintBinding: false,
      backendBinding: false,
      defaultMeasurerReplacement: false,
      wholeDocumentComposition: false,
      productionBinding: false,
      glyphPixelParity: false,
    })
  })

  it("keeps the MR1 path QA-only, Worker-owned, and outside direct Core imports", () => {
    const worker = read("src/qa/liveDraftMr1Evidence.worker.ts")
    const page = read("src/qa/liveDraftMr1EvidencePage.ts")
    const runner = read("scripts/run-live-draft-mr1-evidence.mjs")
    const config = read("vite.config.ts")
    const doc = read("docs/LIVE_DRAFT_MR1_REAL_BROWSER_WORKER.md")

    expect(worker).toContain("@flowdoc/text-engine-rust-wasm/worker-mr1")
    expect(worker).not.toContain("@flowdoc/vnext-core")
    expect(worker).not.toMatch(/node:fs|node:crypto|fetch\(/u)
    expect(page).toContain("liveDraftMr1Evidence.worker.ts")
    expect(page).not.toContain("@flowdoc/vnext-core")
    expect(runner).toContain("--headless=new")
    expect(runner).toContain("backendLikeRequests")
    expect(config).toContain("/^@flowdoc\\/vnext-core$/u")
    expect(doc).toContain("p50 about 1.9 ms")
    expect(doc).toContain("does not establish Canvas/PDF glyph")
  })
})
