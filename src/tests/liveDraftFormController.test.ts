import { describe, expect, it } from "vitest"
import {
  createFlowDocLiveDraftFormControllerV1,
  createFlowDocLiveDraftFormRequestIdV1,
} from "../editor/liveDraft/liveDraftFormController"
import type { FlowDocLiveDraftFormControllerStateV1 } from "../editor/liveDraft/liveDraftFormController"
import type { FlowDocLiveDraftFormProjectionResultV1 } from "../editor/liveDraft/liveDraftFormProjection"
import type { FlowDocLiveDraftFormResultV1 } from "../editor/liveDraft/liveDraftWorkerProtocol"

type ReadyProjection = Extract<FlowDocLiveDraftFormProjectionResultV1, { status: "ready" }>

function projection(revision: number, text: string): ReadyProjection {
  return {
    contractVersion: "live-draft-form-projection-xr3-v1",
    status: "ready",
    documentId: "document-1",
    structureRevision: 1,
    formRevision: revision,
    fieldKey: "documentTitle",
    text,
    draftSnapshotFingerprint: `draft:${revision}`,
    canonicalFormCandidateFingerprint: `candidate:${revision}`,
    contracts: {
      selectedScalarOnly: true,
      wholeDocumentResolution: false,
      backendAdmission: false,
      storage: "memory-only",
    },
  }
}

function result(input: ReadyProjection): FlowDocLiveDraftFormResultV1 {
  return {
    protocolVersion: 1,
    type: "live-draft.form-result",
    exactness: "draft-current",
    identity: {
      documentId: input.documentId,
      structureRevision: input.structureRevision,
      draftSnapshotFingerprint: input.draftSnapshotFingerprint,
      canonicalFormCandidateFingerprint: input.canonicalFormCandidateFingerprint,
      assetRegistryFingerprint: "assets",
      measurementProfileId: "profile",
      fontManifestFingerprint: "fonts",
      wasmSha256: "a".repeat(64),
      layoutPipelineVersion: "xr3",
      requestId: createFlowDocLiveDraftFormRequestIdV1(input),
      requestRevision: input.formRevision,
    },
    textBlock: {
      textBlockId: "live-draft-form:documentTitle",
      fieldKey: input.fieldKey,
      text: input.text,
      fontId: "sarabun-regular",
      fontSha256: "b".repeat(64),
    },
    coreLayout: {
      contractVersion: "core-live-draft-one-block-xr2-v1",
      measurement: {
        cacheStatus: "miss",
        widthPt: 10,
        heightPt: 18,
        lineHeightPt: 18,
        lineBoxes: [{
          index: 0, text: input.text, startOffset: 0, endOffset: input.text.length,
          widthPt: 10, heightPt: 18, yOffsetPt: 0,
        }],
      },
      acceptanceSummary: { lineCount: 1, renderedLength: input.text.length, totalHeightPt: 18 },
      pagination: {
        status: "complete",
        measurementFingerprint: `measurement:${input.formRevision}`,
        fingerprint: `pagination:${input.formRevision}`,
        summary: { pageCount: 1, fragmentCount: 1, lineCount: 1, splitAcrossPages: false },
        work: { pageAttemptCount: 1, lineVisitCount: 1, cursorCommitCount: 1 },
        pages: [{
          familyPageIndex: 0, availableHeightPt: 252, usedHeightPt: 18, remainingHeightPt: 234,
          fragmentFingerprint: `fragment:${input.formRevision}`, lineStartIndex: 0,
          lineEndIndexExclusive: 1, heightPt: 18,
        }],
      },
      timings: {
        providerInvoked: true, providerMs: 1, measurementMs: 2,
        acceptanceMs: 1, paginationMs: 1, coreBoundaryMs: 4,
      },
    },
    durationMs: 5,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe("LIVE-DRAFT-XR-3 Form controller", () => {
  it("coalesces rapid edits into the latest debounced request", async () => {
    const timers = new Map<number, () => void>()
    const requests: ReadyProjection[] = []
    const states: FlowDocLiveDraftFormControllerStateV1[] = []
    let nextTimer = 1
    const controller = createFlowDocLiveDraftFormControllerV1({
      dependencies: {
        layout: async ({ projection: current }) => {
          requests.push(current)
          return result(current)
        },
        cancel: () => undefined,
        now: () => 100,
        setTimer: (callback) => { const id = nextTimer++; timers.set(id, callback); return id },
        clearTimer: (timer) => { timers.delete(timer as number) },
        onStateChange: (state) => states.push(state),
      },
    })

    controller.update(projection(1, "a"))
    controller.update(projection(2, "ab"))
    controller.update(projection(3, "abc"))
    expect(timers.size).toBe(1)
    expect(requests).toHaveLength(0)
    timers.values().next().value?.()
    await Promise.resolve()
    await Promise.resolve()

    expect(requests.map((item) => item.formRevision)).toEqual([3])
    expect(controller.getState()).toMatchObject({
      phase: "draft-current",
      appliedRevision: 3,
      metrics: { scheduledCount: 3, requestCount: 1, appliedCount: 1 },
    })
    expect(states.at(-1)?.lastValid?.projection.text).toBe("abc")
  })

  it("preserves the last valid result and rejects a late obsolete result", async () => {
    const timers = new Map<number, () => void>()
    const pending = new Map<number, ReturnType<typeof deferred<FlowDocLiveDraftFormResultV1>>>()
    const cancelled: number[] = []
    let nextTimer = 1
    let now = 0
    const controller = createFlowDocLiveDraftFormControllerV1({
      debounceMs: 1,
      dependencies: {
        layout: ({ projection: current }) => {
          const value = deferred<FlowDocLiveDraftFormResultV1>()
          pending.set(current.formRevision, value)
          return value.promise
        },
        cancel: ({ requestRevision }) => { cancelled.push(requestRevision) },
        now: () => now,
        setTimer: (callback) => { const id = nextTimer++; timers.set(id, callback); return id },
        clearTimer: (timer) => { timers.delete(timer as number) },
        onStateChange: () => undefined,
      },
    })
    const runTimer = () => { const callback = timers.values().next().value; timers.clear(); callback?.() }

    const first = projection(1, "first")
    controller.update(first)
    runTimer()
    now = 5
    pending.get(1)?.resolve(result(first))
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getState().lastValid?.projection.formRevision).toBe(1)

    const second = projection(2, "second")
    controller.update(second)
    expect(controller.getState()).toMatchObject({ phase: "draft-updating", appliedRevision: 1 })
    expect(controller.getState().lastValid?.projection.text).toBe("first")
    runTimer()
    const third = projection(3, "third")
    controller.update(third)
    runTimer()
    expect(cancelled).toEqual([2])

    pending.get(2)?.resolve(result(second))
    await Promise.resolve()
    pending.get(3)?.resolve(result(third))
    now = 12
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.getState()).toMatchObject({
      phase: "draft-current",
      appliedRevision: 3,
      metrics: { requestCount: 3, appliedCount: 2, staleResultCount: 1, cancellationCount: 1 },
    })
    expect(controller.getState().lastValid?.projection.text).toBe("third")
  })
})
