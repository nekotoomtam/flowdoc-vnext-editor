import { useMemo, useState } from "react"
import { EditorShell } from "./EditorShell"
import { loadInitialEditorSeed } from "../core/coreAdapter"
import type { PaperPreset } from "../editor/paper/paperModel"
import {
  createInitialEditorState,
  selectEditorNode,
  selectPaperPreset,
  selectPaperZoom,
} from "../editor/runtime/editorState"

export function EditorApp() {
  const initialState = useMemo(() => createInitialEditorState(loadInitialEditorSeed()), [])
  const [editorState, setEditorState] = useState(initialState)

  function handleSelectNode(nodeId: string) {
    setEditorState((currentState) => selectEditorNode(currentState, nodeId, "user-select"))
  }

  function handleSelectPaperPreset(preset: PaperPreset) {
    setEditorState((currentState) => selectPaperPreset(currentState, preset))
  }

  function handleSelectPaperZoom(zoom: number) {
    setEditorState((currentState) => selectPaperZoom(currentState, zoom))
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
