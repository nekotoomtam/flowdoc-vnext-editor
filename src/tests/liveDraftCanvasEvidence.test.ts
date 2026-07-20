import { describe, expect, it } from "vitest"
import evidence from "../fixtures/live-draft-xr4-canvas-page-renderer.v1.json"

describe("LIVE-DRAFT-XR-4 retained Canvas evidence", () => {
  it("records real nonblank responsive Canvas pages from the Core display list", () => {
    expect(evidence.status).toBe("observed-bounded-canvas-renderer")
    expect(evidence.execution).toMatchObject({
      realBrowser: true,
      realWorker: true,
      realCoreDisplayListProjection: true,
      realCanvas2d: true,
      pinnedCanvasFontAsset: true,
    })
    expect(evidence.assertions).toEqual({
      coreDisplayListConsumed: true,
      browserMeasurementForbidden: true,
      browserRelayoutForbidden: true,
      nonBlankPixelsPainted: true,
      pageAndCommandCountsMatch: true,
      previousCanvasRetained: true,
      intrinsicGeometryStable: true,
      responsiveAspectStable: true,
      noHorizontalOverflow: true,
      noBackendTransport: true,
    })
    expect(evidence.observations.firstNonWhitePixelCount).toBeGreaterThan(100)
    expect(evidence.observations.firstCanvasPngSha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(evidence.observations.multiPageCanvas.pageCount).toBeGreaterThanOrEqual(2)
    expect(evidence.observations.multiPageCanvas.totalCommandCount).toBe(
      evidence.observations.multiPage.displayListCommandCount,
    )
    expect(evidence.observations.crossOriginRequestCount).toBe(0)
    expect(evidence.observations.backendLikeRequestCount).toBe(0)
    expect(evidence.interpretation).toMatchObject({
      lineBreakAndBoundsComeFromCore: true,
      canvasGlyphRasterizationRemainsRendererOwned: true,
      crossRuntimeGlyphPixelParityClaimed: false,
    })
    expect(evidence.scope).toMatchObject({
      qaRouteOnly: true,
      wholeDocumentRenderer: false,
      imagesTablesAndStyledRuns: false,
      publishedPreviewReplacement: false,
      productionPerformanceClaim: false,
    })
  })
})
