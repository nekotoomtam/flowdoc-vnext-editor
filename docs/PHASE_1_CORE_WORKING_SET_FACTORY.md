# Phase 1 Core Working Set Factory

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor core adapter contract and working set factory

## Purpose

This block creates the first adapter-to-working-set path without rewiring the editor runtime.

The goal is to make the core adapter return an editor-safe snapshot with source/revision metadata, then let `src/editor/coreBinding` build the frontend working set from that snapshot.

## Ownership

`src/core/coreAdapter.ts` owns:

- fixture/API/core loading boundary;
- adapter-safe seed shape;
- adapter snapshot metadata;
- source kind, status, createdAt, schema revision, and layout metadata.

`src/editor/coreBinding/workingSetFactory.ts` owns:

- envelope creation;
- read model creation;
- command capability mirror creation;
- render projection summary creation;
- assembly of `FrontendCoreWorkingSet`.

## Current Boundary

The adapter snapshot is still fixture-backed. It does not call real core APIs yet.

The working set factory consumes adapter-safe data and produces a derived working set. React runtime is not rewired to use it in this block.

## Data Flow

```txt
coreAdapter.loadInitialCoreSnapshot()
  -> CoreAdapterSnapshot
  -> createFrontendCoreWorkingSetFromSnapshot()
  -> FrontendCoreWorkingSet
```

## Phase 1 Contract

The factory may:

- create a fresh envelope from adapter metadata;
- build a normalized read model from the adapter seed;
- create a command capability mirror as UI hint only;
- create a placeholder render projection summary;
- omit render projection summary when requested by tests/future lazy loading.

The factory may not:

- mutate adapter seed data;
- expose canonical mutable package objects to React;
- run real layout;
- run real mutations;
- validate final operations;
- replace `EditorRuntimeState`;
- start WYSIWYG.

## Exit Criteria

- core adapter exposes `loadInitialCoreSnapshot`.
- working set factory creates `FrontendCoreWorkingSet`.
- tests prove source/revision metadata is preserved.
- tests prove render projection summary can be omitted.
- tests prove working set data is isolated from later adapter snapshot mutation.
- `npm run check` passes.

## Deferred

- real API/core snapshot loading
- runtime rewiring to use working set
- mutation result packets
- job result packets
- exact layout packets
- WYSIWYG draft integration
