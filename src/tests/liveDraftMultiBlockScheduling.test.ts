import { describe, expect, it } from "vitest"
import type { FlowDocTextEngineMultiRunLayoutInputV1 } from "@flowdoc/text-engine-rust-wasm"
import {
  analyzeFlowDocLiveDraftTextBlockTokenImpactV1,
  tokenizeFlowDocLiveDraftTextBlockV1,
  type FlowDocLiveDraftTextBlockTokenImpactV1,
} from "../editor/liveDraft/liveDraftMultiBlockImpact"
import {
  createFlowDocLiveDraftMultiBlockSchedulerV1,
  type FlowDocLiveDraftMultiBlockJobV1,
} from "../editor/liveDraft/liveDraftMultiBlockScheduler"

function layoutInput(options: {
  revision: number
  textBlockId?: string
  pieces: Array<{
    inlineId: string
    kind: "text" | "hard-break" | "resolved-field"
    text: string
    fieldKey?: string
    fontWeight?: "normal" | "bold"
  }>
}): FlowDocTextEngineMultiRunLayoutInputV1 {
  let offset = 0
  const runs = options.pieces.map((piece) => {
    const renderStartOffset = offset
    offset += piece.text.length
    return {
      inlineId: piece.inlineId,
      kind: piece.kind,
      renderStartOffset,
      renderEndOffset: offset,
      renderedText: piece.text,
      styleKey: "body",
      ...(piece.fieldKey == null ? {} : { fieldKey: piece.fieldKey }),
      ...(piece.fontWeight == null ? {} : { localStyle: { fontWeight: piece.fontWeight } }),
    }
  })
  return {
    layoutId: `layout-${options.revision}`,
    measurement: {
      documentId: "document-scheduler",
      instanceRevision: options.revision,
      sectionId: "section-main",
      textBlockId: options.textBlockId ?? "block-active",
      availableWidthPt: 120,
      measurementProfileId: "profile-scheduler",
      styleKey: "body",
      renderedText: options.pieces.map((piece) => piece.text).join(""),
      runs,
    },
    declaredLineHeightLayoutUnit: 18_000_000,
    paragraphStyle: {
      styleKey: "body",
      runStyle: {
        fontFamilyKey: "sarabun",
        fontSize: { value: 12, unit: "pt" },
        textColor: "202020",
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        strikethrough: false,
      },
    },
    fontFaces: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function settlePromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function impact(textBlockId: string, options: {
  change?: FlowDocLiveDraftTextBlockTokenImpactV1["change"]
  completed?: boolean
} = {}): FlowDocLiveDraftTextBlockTokenImpactV1 {
  return {
    textBlockId,
    change: options.change ?? "content",
    previousTokenCount: 1,
    currentTokenCount: 1,
    commonPrefixTokenCount: 0,
    commonSuffixTokenCount: 0,
    previousDirtyTokenRange: { startIndex: 0, endIndex: 1 },
    currentDirtyTokenRange: { startIndex: 0, endIndex: 1 },
    currentDirtyRenderRange: { startOffset: 0, endOffset: 1 },
    dirtyTokenIds: [`${textBlockId}:0-1`],
    completedTokenBoundary: options.completed ?? false,
    recommendedDispatch: options.completed === true ? "immediate" : "coalesced",
    contracts: {
      purpose: "scheduling-and-invalidation-hint",
      lineBreakAuthority: false,
      geometryAuthority: false,
      exactLayoutStillRequired: true,
    },
  }
}

function job(
  textBlockId: string,
  documentRevision: number,
  visibility: "active" | "visible" | "near-viewport" | "offscreen",
  options: { edge?: boolean; completed?: boolean } = {},
): FlowDocLiveDraftMultiBlockJobV1<string> {
  return {
    textBlockId,
    documentRevision,
    contentFingerprint: `${textBlockId}:r${documentRevision}`,
    impact: impact(textBlockId, { completed: options.completed }),
    context: {
      visibility,
      nearLineEdge: options.edge ?? false,
      nearPageEdge: options.edge ?? false,
    },
    payload: `${textBlockId}:payload-r${documentRevision}`,
  }
}

describe("Live Draft multi-block token impact and scheduling", () => {
  it("finds a bounded lexical token change while leaving geometry authority with exact layout", () => {
    const previous = layoutInput({ revision: 1, pieces: [{ inlineId: "text", kind: "text", text: "สวัสดี โลก" }] })
    const current = layoutInput({ revision: 2, pieces: [{ inlineId: "text", kind: "text", text: "สวัสดี FlowDoc" }] })
    const result = analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous, current })

    expect(tokenizeFlowDocLiveDraftTextBlockV1(previous).length).toBeGreaterThan(1)
    expect(result).toMatchObject({
      textBlockId: "block-active",
      change: "content",
      commonPrefixTokenCount: expect.any(Number),
      recommendedDispatch: "coalesced",
      contracts: {
        purpose: "scheduling-and-invalidation-hint",
        lineBreakAuthority: false,
        geometryAuthority: false,
        exactLayoutStillRequired: true,
      },
    })
    expect(result.currentDirtyRenderRange.endOffset).toBe(current.measurement.renderedText.length)
    expect(result.dirtyTokenIds.length).toBeGreaterThan(0)
  })

  it("dispatches completed and structural tokens immediately", () => {
    const previous = layoutInput({ revision: 1, pieces: [{ inlineId: "text", kind: "text", text: "FlowDoc" }] })
    const completed = layoutInput({ revision: 2, pieces: [{ inlineId: "text", kind: "text", text: "FlowDoc " }] })
    const structural = layoutInput({
      revision: 3,
      pieces: [
        { inlineId: "text", kind: "text", text: "FlowDoc" },
        { inlineId: "break", kind: "hard-break", text: "\n" },
      ],
    })
    expect(analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous, current: completed })).toMatchObject({
      change: "content",
      completedTokenBoundary: true,
      recommendedDispatch: "immediate",
    })
    expect(analyzeFlowDocLiveDraftTextBlockTokenImpactV1({ previous: completed, current: structural })).toMatchObject({
      change: "structural",
      recommendedDispatch: "immediate",
    })
  })

  it("starts active edge work first, replaces queued revisions, and never applies stale completion", async () => {
    const drains: Array<() => void> = []
    const executions: string[] = []
    const completions = new Map<string, ReturnType<typeof deferred<string>>>()
    const results: Array<{ status: string; revision: number; value?: string }> = []
    const scheduler = createFlowDocLiveDraftMultiBlockSchedulerV1<string, string>({
      execute(current) {
        executions.push(`${current.textBlockId}:r${current.documentRevision}`)
        const pending = deferred<string>()
        completions.set(`${current.textBlockId}:r${current.documentRevision}`, pending)
        return pending.promise
      },
      queueMicrotask(callback) {
        drains.push(callback)
      },
      onResult(event) {
        results.push({
          status: event.status,
          revision: event.job.documentRevision,
          ...("result" in event && event.result != null ? { value: event.result } : {}),
        })
      },
    })

    scheduler.schedule(job("block-offscreen", 1, "offscreen"))
    scheduler.schedule(job("block-visible", 1, "visible"))
    scheduler.schedule(job("block-active", 1, "active", { edge: true }))
    drains.shift()?.()
    expect(executions).toEqual(["block-active:r1"])

    scheduler.schedule(job("block-active", 2, "active", { edge: true }))
    scheduler.schedule(job("block-active", 3, "active", { edge: true, completed: true }))
    expect(scheduler.getState().queued.filter((candidate) => candidate.textBlockId === "block-active")).toHaveLength(1)
    expect(scheduler.getState().metrics.coalescedCount).toBe(1)

    completions.get("block-active:r1")!.resolve("obsolete-r1")
    await settlePromises()
    expect(results).toContainEqual({ status: "stale", revision: 1, value: "obsolete-r1" })
    drains.shift()?.()
    expect(executions).toEqual(["block-active:r1", "block-active:r3"])

    completions.get("block-active:r3")!.resolve("current-r3")
    await settlePromises()
    expect(results).toContainEqual({ status: "applied", revision: 3, value: "current-r3" })
    expect(scheduler.getState().metrics).toMatchObject({
      scheduledCount: 5,
      startedCount: 2,
      appliedCount: 1,
      staleResultCount: 1,
      coalescedCount: 1,
      failedCount: 0,
    })
  })
})
