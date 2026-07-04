# Drag/Drop Reorder Contract

Status: active planning contract
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
