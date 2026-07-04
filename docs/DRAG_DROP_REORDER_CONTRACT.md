# Drag/Drop Reorder Contract

Status: active implementation contract
Date: 2026-07-04
Scope: FlowDoc vNext editor structural reorder UX before pointer implementation

## Current Evidence

- Core canonical reorder operation accepts `node.reorder` with `toIndex`.
- Backend mutation envelopes already carry `operation.toIndex` and preserve the
  base-revision gate before calling core.
- Editor Inspector move controls still accept only `up` and `down`, but
  `src/editor/commands/reorderPlacement.ts` now plans sibling placements as a
  pure command-layer contract.
- `src/editor/backend/backendMutationRequests.ts` uses the same placement
  planner for existing up/down controls, so future drag/drop should not create
  a second reorder index path.
- `src/app/useCanvasReorderDrag.ts` owns transient canvas drag state and commits
  only a ready same-parent placement through backend mutation flow.
- `src/editor/interaction/canvasReorderHitTest.ts` derives before/after drop
  placement from the target block midpoint.
- Canvas components use pointer events for the first implementation slice rather
  than native HTML drag/drop events so preview/drop state remains editor-owned.

## Boundary Decision

Drag/drop is an editor-owned interaction. It must not mutate local document
truth from pointer events. A drag/drop reorder must flow as:

```text
pointer/keyboard intent
  -> command-layer placement plan
  -> preview-only UI state
  -> backend mutation request with baseRevision and toIndex
  -> backend revision gate
  -> core node.reorder
  -> editor stale-gated runtime apply
```

## Placement Contract

The command layer owns these decisions:

1. Normalize dragged and target DOM/presentation nodes to operation surfaces.
2. Return `ready`, `noop`, or `blocked` before any mutation request is built.
3. Limit the first drag/drop slice to same-parent sibling reorder.
4. Return `fromIndex`, `toIndex`, original `siblingIds`, and
   `previewSiblingIds` for visual insertion preview.
5. Reject self-drop, missing surfaces, non-reorderable dragged surfaces,
   missing parent lists, and cross-parent moves.

The UI layer may use `previewSiblingIds` to draw insertion feedback, but it must
not apply that order to editor runtime state until the backend returns an
accepted mutation result.

## Not Yet Supported

- Cross-parent moves.
- Dropping into empty containers.
- Table row/column drag/drop.
- Multi-node drag/drop.
- Auto-scroll while dragging.
- Persisted drag sessions across document revision changes.

These require explicit contracts before implementation. Do not infer them from
pointer behavior alone.

## Next Implementation Slice

1. Add an editor-owned transient drag session module.
2. Hit-test canvas surfaces to a dragged node, drop target node, and placement.
3. Call `createSiblingReorderPlacementPlan(...)` on hover to show ready,
   blocked, or noop preview states.
4. On drop, build the existing backend mutation request from the accepted
   placement `toIndex`.
5. Keep keyboard move up/down as the accessibility fallback until a richer
   keyboard placement mode is designed.

The first same-parent canvas implementation slice is now present. The next
slice should improve confidence and ergonomics rather than widen semantics:

1. Add browser QA evidence for actual pointer drag/drop preview and successful
   drop.
2. Add blocked-target visual evidence once a same-page blocked target is
   available in fixture data.
3. Add auto-scroll and richer keyboard placement only after the preview/drop
   path is stable.

## Browser QA Evidence

2026-07-04:

- QA target: `http://127.0.0.1:4001/` with backend
  `http://127.0.0.1:4011/health`.
- Baseline: document loaded at `api r3`, order `title`, `summary-columns`,
  `detail-table`, history `0`.
- Action: pointer-dragged `title` after `summary-columns`.
- PASS: order changed to `summary-columns`, `title`, `detail-table`.
- PASS: backend mutation result advanced to `r4`, history became `1`, and
  selection remained on `title`.
- Cleanup: backend dev state was reset and the browser reloaded back to `api r3`
  with history `0`.
