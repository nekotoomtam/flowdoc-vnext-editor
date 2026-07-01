import { describe, expect, it } from "vitest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import {
  canApplyCoreDerivedResultToEnvelope,
  getCoreDerivedApplyBlockReason,
} from "../editor/coreBinding/revisionGuards"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { applyRuntimeJobResult } from "../editor/runtime/runtimeJobResults"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

function createStateWithQueuedLayoutJob() {
  const state = createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    createdAt: 100,
  }))

  return dispatchEditorRuntimeCommand(state, {
    kind: "layout.requestLive",
    reason: "stale-apply-gate-test",
    source: "system",
    target: {
      nodeIds: ["qa-scroll"],
    },
  }).state
}

describe("revision stale apply gate", () => {
  it("accepts core-derived results that match the active envelope revision", () => {
    const state = createStateWithQueuedLayoutJob()
    const job = state.jobs.jobs[0]

    expect(getCoreDerivedApplyBlockReason({
      baseRevision: job.requestRevision,
      sourceRevision: job.requestRevision,
    }, state.core.envelope)).toBeNull()
    expect(canApplyCoreDerivedResultToEnvelope({
      baseRevision: job.requestRevision,
      sourceRevision: job.requestRevision,
    }, state.core.envelope)).toBe(true)
  })

  it("blocks core-derived results with an older base revision", () => {
    const state = createStateWithQueuedLayoutJob()

    expect(getCoreDerivedApplyBlockReason({
      baseRevision: state.core.envelope.documentRevision - 1,
      sourceRevision: state.core.envelope.documentRevision,
    }, state.core.envelope)).toBe("base-revision-mismatch")
  })

  it("applies fresh runtime job results", () => {
    const state = createStateWithQueuedLayoutJob()
    const job = state.jobs.jobs[0]
    const applied = applyRuntimeJobResult(state, {
      jobId: job.id,
      producedRevision: state.core.envelope.documentRevision,
      status: "completed",
      summary: "Live layout placeholder completed",
    })

    expect(applied).toMatchObject({
      reason: null,
      status: "applied",
    })
    expect(applied.state.jobs.jobs[0]).toMatchObject({
      id: job.id,
      status: "completed",
    })
  })

  it("marks old runtime job results stale instead of applying them", () => {
    const state = createStateWithQueuedLayoutJob()
    const job = state.jobs.jobs[0]
    const newerState = {
      ...state,
      core: {
        ...state.core,
        envelope: {
          ...state.core.envelope,
          documentRevision: state.core.envelope.documentRevision + 1,
        },
      },
    }
    const applied = applyRuntimeJobResult(newerState, {
      jobId: job.id,
      producedRevision: job.requestRevision,
      status: "completed",
      summary: "Old live layout result",
    })

    expect(applied).toMatchObject({
      reason: "base-revision-mismatch",
      status: "blocked-stale",
    })
    expect(applied.state.jobs.jobs[0]).toMatchObject({
      id: job.id,
      status: "stale",
    })
  })

  it("does not mutate runtime state for missing job results", () => {
    const state = createStateWithQueuedLayoutJob()
    const applied = applyRuntimeJobResult(state, {
      jobId: "missing-job",
      producedRevision: state.core.envelope.documentRevision,
      status: "completed",
      summary: "Missing result",
    })

    expect(applied).toMatchObject({
      reason: "missing-job",
      status: "missing-job",
    })
    expect(applied.state).toBe(state)
  })
})
