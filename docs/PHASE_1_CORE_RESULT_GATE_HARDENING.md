# Phase 1 Core Result Gate Hardening

Status: active
Date opened: 2026-07-02
Scope: Apply gate coverage for non-job core-derived results

## Purpose

This block expands the stale apply gate beyond job results.

Before wiring real core/API read packets, the runtime should prove that render projection results and diagnostics results cannot update the working set when their revisions are stale.

## Ownership

`runtimeApplyGate` owns the generic runtime decision.

`runtimeRenderResults` owns render projection result application.

`runtimeDiagnosticsResults` owns diagnostics result application.

## Current Boundary

This block does not introduce transport, API calls, workers, or exact layout.

Fresh results update the working set. Stale results return a blocked decision and leave runtime state unchanged.

## Data Flow

```txt
core-derived result
  -> runtime apply gate
  -> accepted: update derived working set cache
  -> blocked-stale: return reason and keep state unchanged
```

## Phase 1 Contract

Render results may update:

- `core.renderProjection`

Diagnostics results may update:

- `core.diagnostics`
- `core.envelope.diagnostics`
- compatibility `seed.diagnostics`

Stale results must not update:

- render projection summary
- diagnostics summary
- compatibility seed
- document/read model/runtime selection

## Exit Criteria

- render projection result apply goes through the stale apply gate;
- diagnostics result apply goes through the stale apply gate;
- tests prove fresh results update state;
- tests prove stale results leave state unchanged;
- `npm run check` passes.

## Deferred

- real render packet transport
- real diagnostics packet transport
- user-facing stale result notification
- recovery/retry commands
- mutation bridge
- WYSIWYG
