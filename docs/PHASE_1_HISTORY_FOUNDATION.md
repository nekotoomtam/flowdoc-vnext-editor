# Phase 1 History Foundation

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor history placeholder contract

## Purpose

History records accepted editor intents so future undo/redo can be added without changing every runtime service.

Phase 1 history is an audit trail and record shape only. It is not an undo engine.

## Ownership

`src/editor/history` owns:

- history record shape
- stack state
- record creation from accepted command results
- undo/redo capability flags
- merge metadata placeholders

`src/editor/history` must not own:

- command policy
- command execution
- job queue execution
- core package mutation
- DOM state
- WYSIWYG draft state
- undo/redo replay

## Current Boundary

Runtime dispatch records applied command intents as `undoable: false`.

Selection-only, viewport, and paper commands may appear in the audit trail, but they are not durable document undo records.

Rejected and noop commands are not recorded.

## Data Flow

```text
React UI
  -> EditorCommand
  -> runtime command dispatcher
  -> command executor
  -> applied result
  -> history recorder
  -> EditorRuntimeState.history
```

Commands do not write history directly. Runtime dispatch coordinates command execution and history recording.

## Phase 1 Contract

History may:

- record applied command intent
- store command source, target nodes, changed areas, and revision metadata
- expose `canUndo=false` and `canRedo=false`
- keep redo depth at zero

History may not:

- replay undo or redo
- mutate document state
- call `@flowdoc/vnext-core`
- enqueue jobs
- decide whether a command is allowed
- record rejected or noop commands

## Exit Criteria For This Block

- `EditorRuntimeState` includes `HistoryStackState`.
- UI dispatch uses a runtime command dispatcher.
- applied commands create history records.
- rejected and noop commands do not create records.
- tests prove `canUndo=false` even with records.
- `npm run check` passes.

## Deferred

- undo replay
- redo replay
- command merge windows
- transaction grouping
- document mutation history
- text draft commit history
- history UI
