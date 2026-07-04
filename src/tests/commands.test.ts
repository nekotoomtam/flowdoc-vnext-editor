import { describe, expect, it } from "vitest"
import { CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID, loadInitialEditorSeed } from "../core/coreAdapter"
import { canExecuteCommand } from "../editor/commands/commandPolicy"
import type { EditorCommand } from "../editor/commands/commandTypes"
import { getDeleteConfirmationRequirement } from "../editor/commands/deleteSafety"
import { executeEditorCommand } from "../editor/commands/commandExecutor"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import {
  createInitialEditorState,
  createInitialEditorStateFromWorkingSet,
} from "../editor/runtime/editorState"

function createCoreFixtureState() {
  return createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
    baseRevision: 3,
    createdAt: 100,
    documentId: CORE_PRODUCT_REPORT_MINIMAL_DOCUMENT_ID,
    fixtureSource: "core-product-report-minimal",
  }))
}

describe("command foundation", () => {
  it("requires delete confirmation while undo is unavailable", () => {
    expect(getDeleteConfirmationRequirement({
      childCount: 0,
      id: "body-text",
      label: "Body text",
      operationSurface: "text-block",
      type: "text-block",
    })).toEqual({
      message: "Delete Body text?",
      required: true,
      title: "Confirm delete",
    })
    expect(getDeleteConfirmationRequirement({
      childCount: 2,
      id: "summary-columns",
      label: "Summary columns",
      operationSurface: "columns",
      type: "columns",
    })).toEqual({
      message: "Delete Summary columns and 2 nested items?",
      required: true,
      title: "Confirm delete",
    })
  })

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

  it("authorizes operation-surface commands as dry runs with normalized targets", () => {
    const state = createCoreFixtureState()

    const openDraft = executeEditorCommand(state, {
      kind: "node.openTextDraft",
      reason: "toolbar-open",
      source: "toolbar",
      target: {
        nodeId: "title",
      },
    })
    const deleteFromInternalText = executeEditorCommand(state, {
      kind: "node.delete",
      reason: "keyboard-delete",
      source: "keyboard",
      target: {
        nodeId: "detail-cell-b-text",
      },
    })
    const reorderFromInternalText = executeEditorCommand(state, {
      kind: "node.reorder",
      payload: {
        direction: "down",
      },
      reason: "keyboard-reorder",
      source: "keyboard",
      target: {
        nodeId: "summary-left-text",
      },
    })

    expect(canExecuteCommand({
      kind: "node.duplicate",
      reason: "toolbar-duplicate",
      source: "toolbar",
      target: {
        nodeId: "detail-table",
      },
    }, state)).toMatchObject({
      allowed: true,
    })
    expect(openDraft.result).toMatchObject({
      command: "node.openTextDraft",
      stateChanged: false,
      status: "dry-run",
    })
    expect(openDraft.state).toBe(state)
    expect(openDraft.command).toMatchObject({
      target: {
        nodeId: "title",
      },
    })
    expect(deleteFromInternalText.result).toMatchObject({
      command: "node.delete",
      stateChanged: false,
      status: "dry-run",
    })
    expect(deleteFromInternalText.command).toMatchObject({
      target: {
        nodeId: "detail-table",
      },
    })
    expect(reorderFromInternalText.command).toMatchObject({
      target: {
        nodeId: "summary-columns",
      },
    })
    expect(reorderFromInternalText.result).toMatchObject({
      command: "node.reorder",
      status: "dry-run",
    })
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

  it("rejects operation-surface commands that fail surface or capability policy", () => {
    const state = createCoreFixtureState()
    const tableTextDraft = {
      kind: "node.openTextDraft" as const,
      reason: "test",
      source: "toolbar" as const,
      target: {
        nodeId: "detail-cell-b-text",
      },
    }
    const rootDelete = {
      kind: "node.delete" as const,
      reason: "test",
      source: "keyboard" as const,
      target: {
        nodeId: "root",
      },
    }
    const invalidReorderDirection = {
      kind: "node.reorder",
      payload: {
        direction: "sideways",
      },
      reason: "test",
      source: "keyboard",
      target: {
        nodeId: "title",
      },
    } as unknown as EditorCommand

    expect(canExecuteCommand(tableTextDraft, state)).toMatchObject({
      allowed: false,
      reason: "Operation surface cannot open a text draft",
      severity: "blocked",
    })
    expect(executeEditorCommand(state, tableTextDraft).result).toMatchObject({
      command: "node.openTextDraft",
      status: "rejected",
    })
    expect(canExecuteCommand(rootDelete, state)).toMatchObject({
      allowed: false,
      reason: "Node does not resolve to an operation surface: root",
    })
    expect(executeEditorCommand(state, invalidReorderDirection).result).toMatchObject({
      command: "node.reorder",
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
