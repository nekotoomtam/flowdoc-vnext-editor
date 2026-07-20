import { describe, expect, it } from "vitest"
import evidence from "../fixtures/live-draft-xr3-form-binding.v1.json"

describe("LIVE-DRAFT-XR-3 retained browser evidence", () => {
  it("records a bounded latest-revision Form binding without Backend transport", () => {
    expect(evidence.status).toBe("observed-bounded-form-binding")
    expect(evidence.execution).toMatchObject({
      realBrowser: true,
      realWorker: true,
      realCoreLayoutBoundary: true,
      realFormStateAndCanonicalCandidate: true,
      debounceMs: 75,
      selectedScalarFieldOnly: true,
    })
    expect(evidence.assertions).toEqual({
      rapidEditsCoalesced: true,
      latestRevisionApplied: true,
      previousValidPreviewRetained: true,
      coreAcceptedLinesRendered: true,
      noBackendTransport: true,
    })
    expect(evidence.observations.metrics.first.scheduledCount).toBe(evidence.observations.firstEditCount)
    expect(evidence.observations.metrics.first.requestCount).toBe(1)
    expect(evidence.observations.finalAppliedRevision).toBe(evidence.observations.expectedLatestRevision)
    expect(evidence.observations.crossOriginRequestCount).toBe(0)
    expect(evidence.observations.backendLikeRequestCount).toBe(0)
    expect(evidence.scope).toMatchObject({
      qaRouteOnly: true,
      wholeDocumentIncrementalInvalidation: false,
      backendAdmission: false,
      publishedPreviewReplacement: false,
      exactPdfPreviewReplacement: false,
      productionPerformanceClaim: false,
    })
  })
})
