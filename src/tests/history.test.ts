import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { executeEditorCommand } from "../editor/commands/commandExecutor"
import { createHistoryRecord } from "../editor/history/historyRecorder"
import { createHistoryStackState, pushHistoryRecord } from "../editor/history/historyStack"
import { createInitialEditorState } from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

describe("history foundation", () => {
  it("creates history records only for applied command results", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const applied = executeEditorCommand(state, {
      kind: "viewport.setZoom",
      payload: {
        zoom: 1.05,
      },
      source: "toolbar",
    })
    const noop = executeEditorCommand(state, {
      kind: "viewport.setZoom",
      payload: {
        zoom: state.viewport.zoom,
      },
      source: "toolbar",
    })

    expect(createHistoryRecord({
      command: applied.command,
      documentRevisionAfter: applied.state.seed.document.documentVersion,
      documentRevisionBefore: state.seed.document.documentVersion,
      result: applied.result,
      timestamp: 100,
    })).toMatchObject({
      changed: ["viewport", "paper"],
      kind: "viewport",
      label: "Set viewport zoom",
      payloadSummary: "105%",
      sourceCommand: "viewport.setZoom",
      undoable: false,
    })
    expect(createHistoryRecord({
      command: noop.command,
      documentRevisionAfter: noop.state.seed.document.documentVersion,
      documentRevisionBefore: state.seed.document.documentVersion,
      result: noop.result,
      timestamp: 100,
    })).toBeNull()
  })

  it("keeps history stack non-undoable in Phase 1", () => {
    const stack = createHistoryStackState()
    const state = createInitialEditorState(loadInitialEditorSeed())
    const applied = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "outline-select",
      source: "outline",
      target: {
        nodeId: "revenue-table",
      },
    })
    const record = applied.state.history.records[0]
    const nextStack = pushHistoryRecord(stack, record)

    expect(nextStack.records).toHaveLength(1)
    expect(nextStack.canUndo).toBe(false)
    expect(nextStack.canRedo).toBe(false)
    expect(nextStack.undoDepth).toBe(0)
    expect(nextStack.redoDepth).toBe(0)
  })

  it("records applied runtime command dispatches and skips rejected or noop dispatches", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const selected = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "canvas-select",
      source: "canvas",
      target: {
        nodeId: "qa-scroll",
      },
    })
    const noop = dispatchEditorRuntimeCommand(selected.state, {
      kind: "selection.selectNode",
      reason: "canvas-select",
      source: "canvas",
      target: {
        nodeId: "qa-scroll",
      },
    })
    const rejected = dispatchEditorRuntimeCommand(noop.state, {
      kind: "selection.selectNode",
      reason: "canvas-select",
      source: "canvas",
      target: {
        nodeId: "missing-node",
      },
    })

    expect(selected.state.history.records).toHaveLength(1)
    expect(selected.state.history.records[0]).toMatchObject({
      kind: "selection",
      payloadSummary: "qa-scroll",
      source: "canvas",
      targetNodeIds: ["qa-scroll"],
      undoable: false,
    })
    expect(noop.state.history.records).toHaveLength(1)
    expect(rejected.state.history.records).toHaveLength(1)
    expect(rejected.commandResult.result.status).toBe("rejected")
  })

  it("queues runtime job requests without creating history records", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const queued = dispatchEditorRuntimeCommand(state, {
      kind: "layout.requestLive",
      reason: "scroll-stability-check",
      source: "system",
      target: {
        nodeIds: ["qa-scroll"],
      },
    })
    const deduped = dispatchEditorRuntimeCommand(queued.state, {
      kind: "layout.requestLive",
      reason: "scroll-stability-check",
      source: "system",
      target: {
        nodeIds: ["qa-scroll"],
      },
    })

    expect(queued.commandResult.result.status).toBe("queued")
    expect(queued.state.jobs.jobs).toHaveLength(1)
    expect(queued.state.history.records).toHaveLength(0)
    expect(deduped.state.jobs.jobs).toHaveLength(1)
    expect(deduped.state.history.records).toHaveLength(0)
  })
})
