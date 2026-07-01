import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { canExecuteCommand } from "../editor/commands/commandPolicy"
import { executeEditorCommand } from "../editor/commands/commandExecutor"
import { createInitialEditorState } from "../editor/runtime/editorState"

describe("command foundation", () => {
  it("queues live layout requests without mutating document state", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const result = executeEditorCommand(state, {
      kind: "layout.requestLive",
      reason: "scroll-stability-check",
      source: "system",
      target: {
        nodeIds: ["qa-scroll"],
      },
    })

    expect(result.result).toMatchObject({
      command: "layout.requestLive",
      jobRequest: {
        dedupeKey: "layout.live:qa-scroll",
        kind: "layout.live",
        priority: "visible",
        requestRevision: state.seed.document.documentVersion,
      },
      stateChanged: false,
      status: "queued",
    })
    expect(result.state).toBe(state)
  })

  it("applies selection commands through policy and executor", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const result = executeEditorCommand(state, {
      kind: "selection.selectNode",
      reason: "outline-select",
      source: "outline",
      target: {
        nodeId: "revenue-table",
      },
    })

    expect(result.result).toMatchObject({
      changed: ["selection"],
      command: "selection.selectNode",
      status: "applied",
    })
    expect(result.state.selection.selectedNodeId).toBe("revenue-table")
    expect(result.state.selection.selectionReason).toBe("outline-select")
  })

  it("rejects commands with invalid targets or payloads", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const missingNode = {
      kind: "selection.selectNode" as const,
      reason: "test",
      source: "canvas" as const,
      target: {
        nodeId: "missing-node",
      },
    }
    const invalidZoom = {
      kind: "viewport.setZoom" as const,
      payload: {
        zoom: Number.NaN,
      },
      source: "toolbar" as const,
    }
    const invalidLayoutTarget = {
      kind: "layout.requestLive" as const,
      reason: "test",
      source: "system" as const,
      target: {
        nodeIds: ["missing-node"],
      },
    }

    expect(canExecuteCommand(missingNode, state)).toMatchObject({
      allowed: false,
      severity: "blocked",
    })
    expect(executeEditorCommand(state, missingNode).result).toMatchObject({
      command: "selection.selectNode",
      status: "rejected",
    })
    expect(executeEditorCommand(state, invalidZoom).result).toMatchObject({
      command: "viewport.setZoom",
      status: "rejected",
    })
    expect(executeEditorCommand(state, invalidLayoutTarget).result).toMatchObject({
      command: "layout.requestLive",
      status: "rejected",
    })
  })

  it("applies viewport and paper commands without document mutation", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())
    const zoomed = executeEditorCommand(state, {
      kind: "viewport.setZoom",
      payload: {
        zoom: 1.05,
      },
      source: "toolbar",
    })
    const letter = executeEditorCommand(zoomed.state, {
      kind: "viewport.setPaperPreset",
      payload: {
        preset: "Letter",
      },
      source: "toolbar",
    })

    expect(zoomed.result).toMatchObject({
      changed: ["viewport", "paper"],
      status: "applied",
    })
    expect(zoomed.state.viewport.zoom).toBe(1.05)
    expect(zoomed.state.paper.zoom).toBe(1.05)
    expect(letter.result).toMatchObject({
      changed: ["paper"],
      status: "applied",
    })
    expect(letter.state.paper.preset).toBe("Letter")
    expect(letter.state.seed).toBe(state.seed)
    expect(letter.state.view).toBe(state.view)
  })

  it("returns noop for already-active runtime intents", () => {
    const state = createInitialEditorState(loadInitialEditorSeed())

    expect(executeEditorCommand(state, {
      kind: "selection.selectNode",
      reason: "canvas-select",
      source: "canvas",
      target: {
        nodeId: state.selection.selectedNodeId ?? "root",
      },
    }).result).toMatchObject({
      status: "noop",
    })
    expect(executeEditorCommand(state, {
      kind: "viewport.setPaperPreset",
      payload: {
        preset: state.paper.preset,
      },
      source: "toolbar",
    }).result).toMatchObject({
      status: "noop",
    })
    expect(executeEditorCommand(state, {
      kind: "viewport.setZoom",
      payload: {
        zoom: state.viewport.zoom,
      },
      source: "toolbar",
    }).result).toMatchObject({
      status: "noop",
    })
  })
})
