import { describe, expect, it, vi } from "vitest"
import type {
  FlowDocTextEngineMultiRunLayoutInputV1,
  FlowDocTextEngineMultiRunLayoutResultV1,
} from "@flowdoc/text-engine-rust-wasm"
import {
  createFlowDocLiveDraftMultiRunControllerV1,
  type FlowDocLiveDraftMultiRunCompletionV1,
  type FlowDocLiveDraftMultiRunControllerStateV1,
  type FlowDocLiveDraftMultiRunReadyInputV1,
} from "../editor/liveDraft/liveDraftMultiRunController"

vi.mock("../core/coreAdapter", () => ({
  projectCoreLiveDraftMultiRunDisplayListV1: (value: { projectionId: string }) => ({
    status: "ready",
    fingerprint: `display-list:${value.projectionId}`,
    summary: { lineCount: 1, commandCount: 1, nonBlankCommandCount: 1 },
    commands: [],
  }),
}))

function input(documentRevision: number): FlowDocLiveDraftMultiRunReadyInputV1 {
  return {
    status: "ready",
    documentId: "controller-test-document",
    documentRevision,
    contentFingerprint: `controller-content-${documentRevision}`,
    projectionId: `controller-projection-${documentRevision}`,
    origin: { xLayoutUnit: 72_000_000, yLayoutUnit: 72_000_000 },
    layout: { layoutId: `controller-layout-${documentRevision}` } as FlowDocTextEngineMultiRunLayoutInputV1,
  }
}

function completion(current: FlowDocLiveDraftMultiRunReadyInputV1): FlowDocLiveDraftMultiRunCompletionV1 {
  return {
    requestId: `live-draft-multi-run:${current.documentId}:${current.documentRevision}:${current.contentFingerprint}`,
    documentRevision: current.documentRevision,
    contentFingerprint: current.contentFingerprint,
    result: {
      status: "accepted",
      layout: {},
    } as FlowDocTextEngineMultiRunLayoutResultV1,
    workerDurationMs: 5,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

describe("Live Draft MR1 multi-run latest-revision controller", () => {
  it("coalesces undispatched edits, rejects a late completion, and retains last-valid", async () => {
    const timers = new Map<number, () => void>()
    const pending = new Map<number, ReturnType<typeof deferred<FlowDocLiveDraftMultiRunCompletionV1>>>()
    const inputs = new Map<number, FlowDocLiveDraftMultiRunReadyInputV1>()
    const cancelled: number[] = []
    const states: FlowDocLiveDraftMultiRunControllerStateV1[] = []
    let nextTimer = 1
    let now = 0
    const controller = createFlowDocLiveDraftMultiRunControllerV1({
      debounceMs: 1,
      dependencies: {
        layout: ({ input: current }) => {
          const value = deferred<FlowDocLiveDraftMultiRunCompletionV1>()
          inputs.set(current.documentRevision, current)
          pending.set(current.documentRevision, value)
          return value.promise
        },
        cancel: ({ documentRevision }) => { cancelled.push(documentRevision) },
        now: () => now,
        setTimer: (callback) => { const id = nextTimer++; timers.set(id, callback); return id },
        clearTimer: (timer) => { timers.delete(timer as number) },
        onStateChange: (state) => states.push(state),
      },
    })
    const runTimer = () => {
      const callback = timers.values().next().value
      timers.clear()
      callback?.()
    }

    controller.update(input(1))
    controller.update(input(2))
    controller.update(input(3))
    expect(timers.size).toBe(1)
    runTimer()
    expect([...pending.keys()]).toEqual([3])
    now = 8
    pending.get(3)?.resolve(completion(inputs.get(3)!))
    await Promise.resolve()
    await Promise.resolve()
    expect(controller.getState()).toMatchObject({
      phase: "draft-current",
      appliedRevision: 3,
      lastValid: { input: { documentRevision: 3 } },
    })

    controller.update(input(4))
    expect(controller.getState()).toMatchObject({
      phase: "draft-updating",
      pendingRevision: 4,
      appliedRevision: 3,
      lastValid: { input: { documentRevision: 3 } },
    })
    runTimer()
    controller.update(input(5))
    runTimer()
    expect(cancelled).toEqual([4])
    pending.get(5)?.resolve(completion(inputs.get(5)!))
    await Promise.resolve()
    await Promise.resolve()
    pending.get(4)?.resolve(completion(inputs.get(4)!))
    await Promise.resolve()
    await Promise.resolve()

    expect(controller.getState()).toMatchObject({
      phase: "draft-current",
      appliedRevision: 5,
      lastValid: { input: { documentRevision: 5 } },
      metrics: {
        scheduledCount: 5,
        requestCount: 3,
        appliedCount: 2,
        staleResultCount: 1,
        cancellationCount: 1,
        blockedCount: 0,
      },
    })

    controller.update({
      status: "blocked",
      documentId: "controller-test-document",
      documentRevision: 6,
      contentFingerprint: "controller-content-6",
      reason: "invalid latest input",
    })
    expect(controller.getState()).toMatchObject({
      phase: "draft-blocked",
      pendingRevision: null,
      appliedRevision: 5,
      lastValid: { input: { documentRevision: 5 } },
      metrics: { blockedCount: 1 },
    })
    expect(states.at(-1)?.lastValid?.displayList.status).toBe("ready")
  })
})
