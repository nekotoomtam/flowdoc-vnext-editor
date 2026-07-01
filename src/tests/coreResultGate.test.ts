import { describe, expect, it } from "vitest"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import { createRenderProjectionSummary } from "../editor/coreBinding/renderProjectionSummary"
import { projectRenderDocument } from "../editor/render/renderProjector"
import { applyRuntimeDiagnosticsResult } from "../editor/runtime/runtimeDiagnosticsResults"
import { createInitialEditorStateFromWorkingSet } from "../editor/runtime/editorState"
import { applyRuntimeRenderProjectionResult } from "../editor/runtime/runtimeRenderResults"

function createRuntimeState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    createdAt: 100,
  }))
}

function createFreshRenderSummary() {
  const state = createRuntimeState()
  const summary = createRenderProjectionSummary(projectRenderDocument(state.view), {
    documentId: state.core.envelope.documentId,
    kind: "live",
    projectionId: "projection:3:live-test",
    sourceRevision: state.core.envelope.documentRevision,
  })

  return {
    state,
    summary,
  }
}

describe("core result gate hardening", () => {
  it("applies fresh render projection results", () => {
    const { state, summary } = createFreshRenderSummary()
    const applied = applyRuntimeRenderProjectionResult(state, {
      baseRevision: state.core.envelope.documentRevision,
      documentId: state.core.envelope.documentId,
      renderProjection: summary,
      sourceRevision: state.core.envelope.documentRevision,
    })

    expect(applied).toMatchObject({
      reason: null,
      status: "applied",
    })
    expect(applied.state.core.renderProjection).toMatchObject({
      kind: "live",
      projectionId: "projection:3:live-test",
    })
    expect(applied.state.core.renderProjection).not.toBe(summary)
  })

  it("blocks stale render projection results without changing state", () => {
    const { state, summary } = createFreshRenderSummary()
    const applied = applyRuntimeRenderProjectionResult(state, {
      baseRevision: state.core.envelope.documentRevision - 1,
      documentId: state.core.envelope.documentId,
      renderProjection: {
        ...summary,
        projectionId: "projection:old",
      },
      sourceRevision: state.core.envelope.documentRevision - 1,
    })

    expect(applied).toMatchObject({
      reason: "base-revision-mismatch",
      status: "blocked-stale",
    })
    expect(applied.state).toBe(state)
    expect(applied.state.core.renderProjection?.projectionId).not.toBe("projection:old")
  })

  it("applies fresh diagnostics results to working set and compatibility seed", () => {
    const state = createRuntimeState()
    const applied = applyRuntimeDiagnosticsResult(state, {
      baseRevision: state.core.envelope.documentRevision,
      documentId: state.core.envelope.documentId,
      diagnostics: {
        ...state.core.diagnostics,
        artifactStatus: "ready",
        graphIssueCount: 2,
      },
      sourceRevision: state.core.envelope.documentRevision,
    })

    expect(applied).toMatchObject({
      reason: null,
      status: "applied",
    })
    expect(applied.state.core.diagnostics).toMatchObject({
      artifactStatus: "ready",
      graphIssueCount: 2,
    })
    expect(applied.state.core.envelope.diagnostics).toEqual(applied.state.core.diagnostics)
    expect(applied.state.seed.diagnostics).toEqual(applied.state.core.diagnostics)
  })

  it("blocks stale diagnostics results without changing state", () => {
    const state = createRuntimeState()
    const applied = applyRuntimeDiagnosticsResult(state, {
      baseRevision: state.core.envelope.documentRevision,
      documentId: state.core.envelope.documentId,
      diagnostics: {
        ...state.core.diagnostics,
        artifactStatus: "ready",
      },
      sourceRevision: state.core.envelope.documentRevision - 1,
    })

    expect(applied).toMatchObject({
      reason: "revision-mismatch",
      status: "blocked-stale",
    })
    expect(applied.state).toBe(state)
    expect(applied.state.core.diagnostics.artifactStatus).toBe("unknown")
  })
})
