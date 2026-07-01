import { describe, expect, it } from "vitest"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import { loadInitialCoreWorkingSet } from "../editor/coreBinding/workingSetFactory"
import {
  createInitialEditorState,
  createInitialEditorStateFromWorkingSet,
} from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

describe("runtime working set binding", () => {
  it("boots runtime state from a frontend core working set", () => {
    const workingSet = loadInitialCoreWorkingSet({
      createdAt: 100,
    })
    const state = createInitialEditorStateFromWorkingSet(workingSet)

    expect(state.core).toBe(workingSet)
    expect(state.view).toBe(workingSet.readModel)
    expect(state.seed.document).toEqual(workingSet.document)
    expect(state.seed.diagnostics).toEqual(workingSet.diagnostics)
    expect(state.seed.nodes.map((node) => node.id)).toEqual(workingSet.readModel.nodeOrder)
    expect(state.selection.selectedNodeId).toBe("report-title")
    expect(state.selection.selectionReason).toBe("boot")
  })

  it("keeps seed constructor compatible while creating core binding state", () => {
    const seed = loadInitialEditorSeed()
    const state = createInitialEditorState(seed)

    expect(state.core.envelope).toMatchObject({
      documentRevision: seed.document.documentVersion,
      sourceKind: "fixture",
      status: "fresh",
    })
    expect(state.view.nodeOrder).toEqual(seed.nodes.map((node) => node.id))
  })

  it("uses core envelope revision for queued jobs and history records", () => {
    const state = createInitialEditorStateFromWorkingSet(loadInitialCoreWorkingSet({
      createdAt: 100,
    }))
    const queued = dispatchEditorRuntimeCommand(state, {
      kind: "layout.requestLive",
      reason: "runtime-working-set-check",
      source: "system",
      target: {
        nodeIds: ["qa-scroll"],
      },
    })
    const selected = dispatchEditorRuntimeCommand(state, {
      kind: "selection.selectNode",
      reason: "runtime-working-set-check",
      source: "system",
      target: {
        nodeId: "qa-scroll",
      },
    })

    expect(queued.commandResult.result).toMatchObject({
      jobRequest: {
        requestRevision: state.core.envelope.documentRevision,
      },
      status: "queued",
    })
    expect(selected.state.history.records[0]).toMatchObject({
      documentRevisionAfter: state.core.envelope.documentRevision,
      documentRevisionBefore: state.core.envelope.documentRevision,
    })
  })
})
