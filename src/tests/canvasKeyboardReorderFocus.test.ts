import { describe, expect, it } from "vitest"
import { focusCanvasNodeButton } from "../editor/interaction/canvasNodeFocus"
import { getCanvasKeyboardReorderFocusDecision } from "../editor/interaction/canvasKeyboardReorderFocus"
import type { RuntimeNodeMutationStatus } from "../editor/runtime/runtimeMutationStatus"

interface FocusableButtonStub {
  dataset: {
    nodeId: string
  }
  focused: boolean
  focus: () => void
}

function createFocusRoot(nodeIds: string[]) {
  const buttons: FocusableButtonStub[] = nodeIds.map((nodeId) => {
    const button: FocusableButtonStub = {
      dataset: {
        nodeId,
      },
      focused: false,
      focus() {
        this.focused = true
      },
    }
    return button
  })

  return {
    buttons,
    root: {
      querySelectorAll() {
        return buttons
      },
    } as unknown as ParentNode,
  }
}

function mutationStatus(
  status: RuntimeNodeMutationStatus["status"],
  nodeId: string | null,
): RuntimeNodeMutationStatus {
  return {
    command: "node.reorder",
    message: null,
    nodeId,
    status,
  }
}

describe("canvas keyboard reorder focus", () => {
  it("requests focus only after the pending keyboard reorder is applied", () => {
    expect(getCanvasKeyboardReorderFocusDecision(null, mutationStatus("applied", "title"))).toEqual({
      status: "idle",
    })
    expect(getCanvasKeyboardReorderFocusDecision("title", mutationStatus("pending", "title"))).toEqual({
      status: "idle",
    })
    expect(getCanvasKeyboardReorderFocusDecision("title", mutationStatus("applied", "summary-columns"))).toEqual({
      status: "idle",
    })
    expect(getCanvasKeyboardReorderFocusDecision("title", mutationStatus("failed", "title"))).toEqual({
      status: "clear",
    })
    expect(getCanvasKeyboardReorderFocusDecision("title", mutationStatus("applied", "title"))).toEqual({
      nodeId: "title",
      status: "focus",
    })
  })

  it("focuses a remounted canvas node button by data node id", () => {
    const { buttons, root } = createFocusRoot(["summary-columns", "title", "detail-table"])

    expect(focusCanvasNodeButton(root, "title")).toBe(true)
    expect(buttons.map((button) => button.focused)).toEqual([false, true, false])
    expect(focusCanvasNodeButton(root, "missing")).toBe(false)
  })
})
