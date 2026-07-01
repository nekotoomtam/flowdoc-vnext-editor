# Phase 1 Render Projection Foundation

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor render service contract

## Purpose

Render projection converts a normalized editor view into a read-only model that React can render.

This layer exists so fixture data, future core-backed data, viewport state, and React presentation do not become tangled.

## Ownership

`src/editor/render` owns:

- render node summaries derived from `EditorView`
- preview page grouping for scroll stress
- render-only block/page types
- projection functions that are pure and deterministic

`src/editor/render` must not own:

- fixture loading
- core parsing
- document mutation
- command execution
- undo/redo semantics
- DOM scroll writes
- layout or pagination truth
- React component state

## Current Boundary

The current page stack is a preview projection only. It exists to test canvas scrolling, zoom, and selection across multiple visible pages.

It is not exact pagination. Exact pagination must come from the core/layout contract later.

## Data Flow

```text
Core adapter or fixture
  -> EditorView
  -> Render projection
  -> React canvas/paper components
```

The render projection reads `EditorView` and returns a render model. React consumes that model and dispatches user intent back to runtime services.

## Phase 1 Contract

Render projection may:

- filter structural nodes out of paper rendering
- classify nodes as heading, paragraph, table, or generic
- group render nodes into preview pages using a stable heuristic
- expose page count and node IDs for QA

Render projection may not:

- call `@flowdoc/vnext-core`
- read fixtures directly
- mutate `EditorRuntimeState`
- update selection
- update zoom or scroll
- create history records
- enqueue jobs

## Exit Criteria For This Block

- `editorView.ts` no longer owns preview page grouping.
- React imports render page types from `src/editor/render`.
- Tests prove render projection preserves renderable node order.
- Tests prove preview projection creates more than one page for the stress fixture.
- `npm run check` passes.

## Deferred

- exact page layout
- text measurement
- virtualization
- render window clipping
- overlays
- hit-test coordinate mapping
- core-backed pagination
