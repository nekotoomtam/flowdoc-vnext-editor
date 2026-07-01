# Phase 1 Viewport Foundation

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor viewport service contract

## Purpose

Viewport is the editor camera. It owns zoom, scroll measurements, visible page intent, and pending anchors.

This layer exists so React components do not become the owner of scroll, zoom, jump-to-node, or render window behavior.

## Ownership

`src/editor/viewport` owns:

- zoom policy and clamping
- scroll and viewport measurements
- visible/render window page IDs
- pending scroll anchors
- pure viewport actions and selectors

`src/editor/viewport` must not own:

- React component state
- direct DOM scroll writes
- document mutation
- core parsing
- render projection
- command policy
- undo/redo semantics

## Current Boundary

Phase 1 keeps DOM scrolling inside the canvas component. Viewport records intent and state only.

Zoom is now routed through viewport actions, then bridged into `PaperModel` for existing paper rendering. This bridge is transitional; future work can remove zoom from `PaperModel` once canvas and paper components read viewport directly.

## Data Flow

```text
Toolbar or canvas intent
  -> viewport action
  -> ViewportState
  -> PaperModel zoom bridge
  -> render projection and React canvas
```

Explicit jumps should follow this shape later:

```text
outline click
  -> command
  -> viewport.jumpToNode
  -> pendingAnchor
  -> canvas DOM scroll root applies anchor
  -> viewport.anchorApplied
```

## Phase 1 Contract

Viewport may:

- clamp zoom
- track scrollTop and scrollLeft
- track viewport and content dimensions
- create pending anchors for page/node/section jumps
- expose selectors for zoom percent, scroll position, and anchor state

Viewport may not:

- call `scrollIntoView`
- mutate document state
- decide command allowance
- enqueue jobs
- create history records
- project pages or blocks

## Exit Criteria For This Block

- `EditorRuntimeState` includes `ViewportState`.
- zoom changes go through viewport actions.
- paper rendering stays visually unchanged through a compatibility bridge.
- tests prove zoom clamping, scroll measurement, and anchor lifecycle.
- `npm run check` passes.

## Deferred

- real scroll root measurement binding
- jump-to-node DOM application
- scroll anchor restoration across zoom
- render window calculation
- virtualization
- browser-level scroll stress automation
