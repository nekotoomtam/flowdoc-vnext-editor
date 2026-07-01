# Phase 1 Revision / Stale Apply Gate

Status: active
Date opened: 2026-07-02
Scope: FlowDoc vNext Editor stale result blocking before packet apply

## Purpose

This block adds a small apply gate for core-derived results.

The editor must know when a job, packet, render result, diagnostics result, or mutation result was produced for an older document revision. Older results must not apply silently over the current runtime state.

## Ownership

`src/editor/coreBinding/revisionGuards.ts` owns generic revision checks.

`src/editor/runtime/runtimeApplyGate.ts` owns runtime-level apply decisions.

`src/editor/runtime/runtimeJobResults.ts` owns job result application through the runtime gate.

## Current Boundary

This is not a real mutation bridge and not real packet application.

The first concrete use is job results:

```txt
queued job request revision
  -> runtime job result
  -> stale apply gate
  -> apply completed/failed OR mark stale
```

## Phase 1 Contract

Fresh result:

```txt
baseRevision == current core envelope documentRevision
sourceRevision == current core envelope documentRevision
core envelope status == fresh
result not already stale
  -> may apply
```

Stale result:

```txt
baseRevision != current core envelope documentRevision
OR sourceRevision != current core envelope documentRevision
OR core envelope status != fresh
OR result already stale
  -> mark stale
  -> do not apply silently
```

## Exit Criteria

- generic stale apply decision exists;
- runtime helper can accept/reject core-derived results;
- job result application uses the gate;
- tests prove fresh job result applies;
- tests prove old-revision job result becomes stale instead of completed;
- `npm run check` passes.

## Deferred

- mutation packet apply
- render projection packet apply
- diagnostics packet apply
- user-facing stale recovery UI
- API/worker transport
- WYSIWYG
