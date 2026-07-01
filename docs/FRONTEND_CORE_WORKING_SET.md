# Frontend Core Working Set

Status: proposed gate for core read binding
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor frontend/core shared working data

## Purpose

This document defines the local data the frontend must keep so the editor can respond to scroll, click, command preflight, render, and status reads without asking core on every interaction.

The important distinction is ownership:

- frontend owns browser/runtime truth;
- frontend may cache core-derived data as a working set;
- core/backend remain the canonical source for package, operation, exact layout, and artifact truth.

## Working Set Invariants

The Frontend Core Working Set is not canonical truth.

It is:

- revisioned;
- allowed to become stale;
- rebuildable from a core/package/result packet;
- guarded by source and revision metadata;
- never persisted back into the package as-is.

## Ownership Groups

### Frontend-Owned Truth

The frontend owns these because they are browser-local interaction state:

- selection
- caret target
- IME composition
- active draft buffer
- viewport, scroll, zoom
- hover and focus
- render window
- pending UI jobs
- stale markers
- diagnostics panel state

These values must not become package truth.

### Core-Derived Cache In Frontend

The frontend may keep these because the editor needs fast local reads:

- core snapshot envelope
- normalized read model
- command capability mirror
- render projection cache
- node-to-block and node-to-fragment maps
- diagnostics summary
- mutation and job envelope state
- layout status summary

Every core-derived cache must carry revision/source/stale information.

### Core/Backend Truth

The frontend must not become the owner of:

- canonical package truth
- persisted document truth
- schema/parser truth
- relationship graph truth
- operation truth
- exact layout/export truth
- PDF/DOCX artifact truth
- persistence/storage/auth

The frontend may call browser-safe core contracts through `src/core/coreAdapter.ts`, but React/UI must not apply operations itself.

## Core Snapshot Envelope

The envelope names the source revision for the rest of the working set.

Required fields:

```ts
documentId
packageVersion
documentVersion
schemaVersion
coreRevision
documentRevision
snapshotRevision
source
status
capabilities
diagnostics
```

The envelope is used by command policy, mutation guards, render projection, diagnostics, status UI, and latest-only job handling.

## Normalized Read Model

The frontend should keep graph-derived indexes, but not graph truth:

```txt
nodeById
parentById
childrenById
sectionById
zoneById
nodeOrder
textBlockIds
tableIds
```

These are read caches derived from core-safe summaries. They are not a second canonical relationship graph.

## Capability Mirror

The command capability mirror is only a preflight helper for UI state:

```txt
toolbar enable/disable
inspector actions
context menu actions
keyboard shortcut preflight
```

Final validation still runs through command policy, mutation bridge, core adapter, and core operation validation when mutations exist.

## Render Projection Cache

Render projection is local display state. It may be:

```txt
placeholder
live
exact-readonly
```

Even an exact-readonly projection is a read cache. It may draw exact results returned by core/backend, but it must not certify export readiness or artifact truth.

## Operation And Parser Nuance

Frontend may use browser-safe core parser, serializer, or operation contracts through `src/core/coreAdapter.ts`.

Frontend must not implement its own parser, schema truth, operation truth, or UI-level document mutation.

Allowed future shape:

```txt
UI intent
  -> command policy
  -> mutation bridge
  -> coreAdapter browser-safe operation
  -> core operation result
  -> revision-guarded cache apply
```

Blocked:

```txt
React component
  -> mutates document object directly
```

## Summary Rule

```txt
core owns rules
frontend owns working set/cache/runtime
backend owns durable/exact/artifact
```

## Exit Criteria For This Gate

- Working set definitions exist in `src/editor/coreBinding`.
- Core-derived types carry revision/source/stale metadata.
- Tests prove envelope/read model/render projection cache revision behavior.
- No runtime rewiring is required in this gate.
- `npm run check` passes.

## Deferred

- real core read API binding
- API transport
- browser-safe operation execution
- mutation bridge integration
- exact layout packet integration
- WYSIWYG draft runtime
