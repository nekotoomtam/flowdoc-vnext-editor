import { useMemo, useState } from "react"
import { EditorShell } from "./EditorShell"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import type { PaperPreset } from "../editor/paper/paperModel"
import type { EditorCommand, EditorCommandSource } from "../editor/commands/commandTypes"
import { createInitialEditorState } from "../editor/runtime/editorState"
import { dispatchEditorRuntimeCommand } from "../editor/runtime/runtimeCommandDispatch"

export function EditorApp() {
  const initialState = useMemo(() => createInitialEditorState(loadInitialEditorSeed()), [])
  const [editorState, setEditorState] = useState(initialState)

  function dispatchEditorCommand(command: EditorCommand) {
    setEditorState((currentState) => dispatchEditorRuntimeCommand(currentState, command).state)
  }

  function handleSelectNode(nodeId: string, source: EditorCommandSource) {
    dispatchEditorCommand({
      kind: "selection.selectNode",
      reason: `${source}-select`,
      source,
      target: {
        nodeId,
      },
    })
  }

  function handleSelectPaperPreset(preset: PaperPreset) {
    dispatchEditorCommand({
      kind: "viewport.setPaperPreset",
      payload: {
        preset,
      },
      source: "toolbar",
    })
  }

  function handleSelectPaperZoom(zoom: number) {
    dispatchEditorCommand({
      kind: "viewport.setZoom",
      payload: {
        zoom,
      },
      source: "toolbar",
    })
  }

  return (
    <EditorShell
      editorState={editorState}
      onSelectNode={handleSelectNode}
      onSelectPaperPreset={handleSelectPaperPreset}
      onSelectPaperZoom={handleSelectPaperZoom}
    />
  )
}
