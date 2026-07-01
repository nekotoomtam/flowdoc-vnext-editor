# Phase 1 Runtime Working Set Binding

Status: active
Date opened: 2026-07-02
Scope: Bind editor runtime boot to the frontend core working set

## Purpose

This block makes the product editor boot through the working set path while preserving the existing runtime behavior.

The runtime should know which core snapshot, read model, capability mirror, diagnostics, and render projection summary it is using. React still receives runtime state and dispatches intents; it does not call core or mutate package data directly.

## Ownership

`src/editor/coreBinding` owns the derived working set.

`src/editor/runtime` owns runtime state and compatibility binding from working set to existing runtime fields.

`src/app` owns boot composition only.

React components render the runtime view and dispatch intent. They must not load core snapshots.

## Current Boundary

The app now boots from:

```txt
loadInitialCoreWorkingSet()
  -> createInitialEditorStateFromWorkingSet()
  -> EditorShell
```

The old seed-based runtime constructor remains for tests and compatibility, but it creates a working set first.

## Phase 1 Contract

Runtime may:

- hold `core: FrontendCoreWorkingSet`;
- keep existing `seed` and `view` fields as compatibility mirrors;
- read document revision from `core.envelope`;
- show core source/revision/render summary in status UI.

Runtime may not:

- mutate the working set as canonical truth;
- call real core operations;
- replace command policy with capability mirror;
- start WYSIWYG;
- apply stale packets silently.

## Exit Criteria

- `EditorApp` boots from `loadInitialCoreWorkingSet`.
- `EditorRuntimeState` contains the working set.
- command/history revision reads come from `core.envelope`.
- status bar exposes source/revision/render summary.
- tests prove runtime state is bound to working set.
- `npm run check` passes.

## Deferred

- remove compatibility `seed` field
- runtime cache packet apply
- stale packet recovery UI
- real API-backed core snapshot
- mutation bridge
- WYSIWYG draft runtime
