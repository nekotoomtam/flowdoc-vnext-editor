import type { NodeReorderDirection } from "../commands/commandTypes"

export interface CanvasKeyboardReorderInput {
  altKey: boolean
  ctrlKey: boolean
  key: string
  metaKey: boolean
  shiftKey: boolean
}

export interface CanvasKeyboardReorderAction {
  direction: NodeReorderDirection
}

export function getCanvasKeyboardReorderAction(
  input: CanvasKeyboardReorderInput,
): CanvasKeyboardReorderAction | null {
  const hasCommandModifier = input.ctrlKey || input.metaKey
  if (!hasCommandModifier || input.altKey || input.shiftKey) return null

  if (input.key === "ArrowUp") {
    return {
      direction: "up",
    }
  }
  if (input.key === "ArrowDown") {
    return {
      direction: "down",
    }
  }

  return null
}
