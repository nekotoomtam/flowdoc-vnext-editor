# Phase 1 Command Foundation

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor command service contract

## Purpose

Commands turn UI intent into reviewed runtime actions.

This layer exists so React components do not decide whether an editor action is allowed and do not call runtime mutation functions directly.

## Ownership

`src/editor/commands` owns:

- command kind and source types
- command payload shape
- command policy checks
- command result shape
- sync command execution for Phase 1 runtime actions

`src/editor/commands` must not own:

- background job execution
- undo/redo replay
- core package mutation
- DOM scroll writes
- React rendering
- layout truth
- WYSIWYG draft behavior

## Current Boundary

Phase 1 commands cover only safe runtime intents:

- select a node
- set paper preset
- set viewport zoom

Commands may call existing runtime reducers/functions for these safe actions. Commands may not create real document mutations.

## Data Flow

```text
React UI
  -> EditorCommand
  -> command policy
  -> command executor
  -> EditorRuntimeState
  -> render projection
```

Rejected commands return a result with a reason. React may display this later, but Phase 1 does not add toast or notification UI.

## Phase 1 Contract

Commands may:

- validate target node existence
- validate paper preset and zoom payloads
- route selection and viewport/paper commands to runtime functions
- report changed state areas for tests and future history/jobs integration

Commands may not:

- enqueue jobs
- create history records
- call `@flowdoc/vnext-core`
- mutate the DOM
- implement WYSIWYG
- bypass `src/editor/runtime`

## Exit Criteria For This Block

- UI uses command dispatch for selection, paper preset, and zoom.
- command policy rejects invalid node targets and invalid numeric payloads.
- command executor returns applied/rejected/noop results.
- tests cover allowed, rejected, and noop command paths.
- `npm run check` passes.

## Deferred

- keyboard command routing
- command palettes
- background job commands
- mutation commands
- history recording
- user-facing command failure UI
