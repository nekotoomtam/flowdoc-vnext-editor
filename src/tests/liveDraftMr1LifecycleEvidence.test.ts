import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

interface LifecycleStateFactsV1 {
  phase: string
  pendingRevision: number | null
  appliedRevision: number | null
  lastValidRevision: number | null
  lastValidDisplayListFingerprint: string | null
  metrics: {
    scheduledCount: number
    requestCount: number
    appliedCount: number
    staleResultCount: number
    cancellationCount: number
    blockedCount: number
  }
}

interface LifecycleEvidenceV1 {
  evidenceId: string
  status: string
  execution: Record<string, boolean | number>
  identity: {
    initialDisplayListFingerprint: string
    newestDisplayListFingerprint: string
    finalDisplayListFingerprint: string
  }
  outcome: {
    scheduledRevisions: number[]
    requestedRevisions: number[]
    coalescedBeforeDispatchRevisions: number[]
    cancellationRequestedRevisions: number[]
    staleCompletionRevision: number
    appliedRevisions: number[]
    initialCurrent: LifecycleStateFactsV1
    coalescedPending: LifecycleStateFactsV1
    replacementPending: LifecycleStateFactsV1
    newestCurrent: LifecycleStateFactsV1
    afterLateObsolete: LifecycleStateFactsV1
    blockedWithLastValid: LifecycleStateFactsV1
    recoveryPending: LifecycleStateFactsV1
    finalCurrent: LifecycleStateFactsV1
    finalCanvasWidthPx: number
    finalCanvasHeightPx: number
    finalNonWhitePixelCount: number
    finalPngSha256: string
  }
  timing: {
    observationalNoBudget: boolean
    artificialResponseDelayMsByRevision: Record<string, number>
    workerDurationMsByRevision: Record<string, number>
    appliedEndToEndDurationMsByRevision: Record<string, number>
    paintDurationMs: number[]
    sequenceDurationMs: number
  }
  contracts: Record<string, boolean>
  scope: Record<string, boolean>
}

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("Live Draft MR1 rapid-edit lifecycle evidence", () => {
  it("retains last-valid and publishes only the newest accepted revision", () => {
    const evidence = JSON.parse(read(
      "src/fixtures/live-draft-mr1-rapid-edit-lifecycle.v1.json",
    )) as LifecycleEvidenceV1

    expect(evidence).toMatchObject({
      evidenceId: "live-draft-mr1-rapid-edit-lifecycle-v1",
      status: "accepted-bounded-latest-revision-last-valid",
      execution: {
        realChromeWorkerWasm: true,
        initializedWorkerReused: true,
        coreFragmentDisplayListProjection: true,
        realChromeCanvasPaint: true,
        debounceMs: 15,
        rendererMeasuredText: false,
        rendererRelayout: false,
        editorProductBinding: false,
        productionBinding: false,
        backendRequestCount: 0,
      },
      outcome: {
        scheduledRevisions: [1, 2, 3, 4, 5, 7],
        requestedRevisions: [1, 4, 5, 7],
        coalescedBeforeDispatchRevisions: [2, 3],
        cancellationRequestedRevisions: [4],
        staleCompletionRevision: 4,
        appliedRevisions: [1, 5, 7],
        initialCurrent: {
          phase: "draft-current", appliedRevision: 1, lastValidRevision: 1,
        },
        coalescedPending: {
          phase: "draft-updating", pendingRevision: 4, appliedRevision: 1, lastValidRevision: 1,
        },
        replacementPending: {
          phase: "draft-updating", pendingRevision: 5, appliedRevision: 1, lastValidRevision: 1,
        },
        newestCurrent: {
          phase: "draft-current", appliedRevision: 5, lastValidRevision: 5,
        },
        afterLateObsolete: {
          phase: "draft-current", appliedRevision: 5, lastValidRevision: 5,
          metrics: { staleResultCount: 1 },
        },
        blockedWithLastValid: {
          phase: "draft-blocked", pendingRevision: null, appliedRevision: 5, lastValidRevision: 5,
        },
        recoveryPending: {
          phase: "draft-updating", pendingRevision: 7, appliedRevision: 5, lastValidRevision: 5,
        },
        finalCurrent: {
          phase: "draft-current",
          pendingRevision: null,
          appliedRevision: 7,
          lastValidRevision: 7,
          metrics: {
            scheduledCount: 6,
            requestCount: 4,
            appliedCount: 3,
            staleResultCount: 1,
            cancellationCount: 1,
            blockedCount: 1,
          },
        },
        finalCanvasWidthPx: 794,
        finalCanvasHeightPx: 1_123,
        finalNonWhitePixelCount: 10_360,
        finalPngSha256: "277da70d7fc1ff49087b5a7fdbc80185302fbc5c1b8dccac6fed36dcdd87b8e8",
      },
      contracts: {
        debounceCoalescesUndispatchedRevisions: true,
        cancellationIsAdvisory: true,
        staleCompletionCannotPublish: true,
        lastValidRetainedWhilePending: true,
        lastValidRetainedWhileBlocked: true,
        canvasPaintsAcceptedLatestOnly: true,
        rendererMeasuredText: false,
        rendererRelayout: false,
        backendBinding: false,
        productBinding: false,
      },
      scope: {
        oneTextBlock: true,
        rapidConsecutiveRevisions: true,
        debounceCoalescing: true,
        staleCompletionRejection: true,
        lastValidRetention: true,
        recoveryAfterBlockedInput: true,
        qaCanvasPaint: true,
        productCanvasBinding: false,
        backendBinding: false,
        wholeDocumentComposition: false,
        productionBinding: false,
        glyphPixelParity: false,
      },
    })

    const initial = evidence.identity.initialDisplayListFingerprint
    const newest = evidence.identity.newestDisplayListFingerprint
    const final = evidence.identity.finalDisplayListFingerprint
    expect(new Set([initial, newest, final]).size).toBe(3)
    expect(evidence.outcome.coalescedPending.lastValidDisplayListFingerprint).toBe(initial)
    expect(evidence.outcome.replacementPending.lastValidDisplayListFingerprint).toBe(initial)
    expect(evidence.outcome.afterLateObsolete.lastValidDisplayListFingerprint).toBe(newest)
    expect(evidence.outcome.blockedWithLastValid.lastValidDisplayListFingerprint).toBe(newest)
    expect(evidence.outcome.recoveryPending.lastValidDisplayListFingerprint).toBe(newest)
    expect(evidence.outcome.finalCurrent.lastValidDisplayListFingerprint).toBe(final)
    expect(evidence.timing.observationalNoBudget).toBe(true)
    expect(evidence.timing.artificialResponseDelayMsByRevision).toMatchObject({ "4": 120, "5": 5 })
    expect(Object.keys(evidence.timing.workerDurationMsByRevision)).toEqual(["1", "4", "5", "7"])
    expect(Object.keys(evidence.timing.appliedEndToEndDurationMsByRevision)).toEqual(["1", "5", "7"])
    expect(evidence.timing.paintDurationMs).toHaveLength(3)
    expect(evidence.timing.paintDurationMs.every((value) => value >= 0)).toBe(true)
    expect(evidence.timing.sequenceDurationMs).toBeGreaterThan(0)
  })

  it("keeps revision lifecycle and rendering behind their owned boundaries", () => {
    const controller = read("src/editor/liveDraft/liveDraftMultiRunController.ts")
    const worker = read("src/qa/liveDraftMr1LifecycleEvidence.worker.ts")
    const page = read("src/qa/liveDraftMr1LifecycleEvidencePage.ts")
    const painter = read("src/editor/liveDraft/liveDraftMultiRunCanvasPainter.ts")
    const doc = read("docs/LIVE_DRAFT_MR1_RAPID_EDIT_LIFECYCLE.md")

    expect(controller).toContain("projectCoreLiveDraftMultiRunDisplayListV1")
    expect(controller).toContain("contentFingerprint")
    expect(controller).toContain("staleResultCount")
    expect(controller).not.toContain("@flowdoc/vnext-core")
    expect(worker).toContain("@flowdoc/text-engine-rust-wasm/worker-mr1")
    expect(worker).not.toContain("@flowdoc/vnext-core")
    expect(page).not.toContain("@flowdoc/vnext-core")
    expect(painter).not.toContain("measureText")
    expect(doc).toContain("Cancellation is an optimization, not a correctness boundary")
    expect(doc).toMatch(/not accepted budgets/u)
  })
})
