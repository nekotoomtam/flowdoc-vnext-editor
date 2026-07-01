# Phase 1 Jobs Foundation

Status: active
Date opened: 2026-07-01
Scope: FlowDoc vNext Editor jobs placeholder contract

## Purpose

Jobs represent editor work that should not run inside React rendering or inside command policy.

Phase 1 jobs are an in-memory queue and status model only. They do not execute async work, spawn workers, compute real layout, or call core.

## Ownership

`src/editor/jobs` owns:

- job kind and status types
- job request shape
- queue state
- dedupe for queued/running work
- job result application
- job status selectors

`src/editor/jobs` must not own:

- command policy
- history semantics
- core package mutation
- React rendering
- DOM scroll writes
- exact layout truth
- export execution
- WYSIWYG draft state

## Current Boundary

Commands may return a queued job request. Runtime dispatch is responsible for enqueueing that request.

Queued jobs are not recorded in history in Phase 1. They are operational state, not document undo records.

## Data Flow

```text
React UI or system intent
  -> EditorCommand
  -> command policy
  -> command result: queued job request
  -> runtime command dispatcher
  -> job queue
  -> EditorRuntimeState.jobs
```

## Phase 1 Contract

Jobs may:

- accept requests for live layout, exact layout, render projection, export preparation, and diagnostics refresh
- dedupe active jobs by key
- mark jobs completed, failed, cancelled, or stale
- expose counts for status UI

Jobs may not:

- run real layout
- run export
- call `@flowdoc/vnext-core`
- mutate documents
- create history records
- decide whether a command is allowed
- render React UI

## Exit Criteria For This Block

- `EditorRuntimeState` includes `EditorJobQueueState`.
- command result supports a queued job request.
- runtime dispatch enqueues queued job requests.
- queued job dedupe is tested.
- status bar exposes a small job count.
- `npm run check` passes.

## Deferred

- async scheduler
- worker handoff
- real layout jobs
- exact pagination jobs
- export preparation jobs
- diagnostics recomputation
- stale cancellation from typing or revision changes
- user-facing job progress UI
