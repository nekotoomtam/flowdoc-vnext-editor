# Drag/Drop Reorder Contract

Status: active implementation contract
Date: 2026-07-04
Scope: FlowDoc vNext editor structural reorder UX during pointer/keyboard implementation

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
- `src/editor/interaction/canvasReorderAutoScroll.ts` scrolls only the canvas
  scroll root while a pointer drag is near the root edge.
- `src/editor/interaction/canvasReorderDragSession.ts` exposes `ready`,
  `noop`, and `blocked` target states plus a non-rendered reason for testable
  UI affordances.
- Focused paper blocks expose `Control/Meta + ArrowUp/ArrowDown` as the
  current keyboard fallback for adjacent reorder through the same backend
  mutation path.
- Keyboard reorder focus is restored to the moved canvas node after an applied
  backend result so page-boundary remounts can continue receiving keyboard
  input.
- `src/editor/runtime/runtimeBackendMutation.ts` preserves backend mutation
  issue codes for rejected/stale drag-drop recovery before command status is
  shown.
- `docs/REORDER_FAILURE_PATH_QA.md` records the safe no-hook stale recipe,
  `reorder-blocked-target-qa` browser evidence, manual stale browser evidence,
  and the remaining rejected browser evidence boundary.

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
- Persisted drag sessions across document revision changes.

These require explicit contracts before implementation. Do not infer them from
pointer behavior alone.

## Implemented Slice Snapshot

1. The editor owns a transient drag session module.
2. Canvas hit testing maps a dragged node, drop target node, and placement.
3. Hover calls `createSiblingReorderPlacementPlan(...)` to expose ready,
   blocked, or noop preview states.
4. Drop builds the existing backend mutation request from the accepted
   placement `toIndex`.
5. Focused paper blocks keep adjacent keyboard move up/down as the accessibility
   fallback until a richer keyboard placement mode is designed.

The first same-parent canvas implementation slice is now present. Pointer
drag/drop, canvas-root auto-scroll, blocked target affordance, manual stale
browser recovery, and focused keyboard fallback have evidence. Rejected/stale
recovery also has unit/contract evidence. The next slice should improve
confidence and ergonomics rather than widen semantics:

1. Add rejected browser evidence only after an explicit backend-owned QA hook is
   approved; keep rejected recovery covered by contract tests until then.
2. Add browser keyboard fallback QA evidence during the next manual browser
   pass; keep unit/source evidence as the current guard until then.
3. Design richer keyboard placement, cross-parent moves, empty-container drops,
   and multi-node behavior only after explicit product contracts exist.

Current canonical product fixture note: `core-product-report-minimal` renders
only `title`, `summary-columns`, and `detail-table` as canvas surfaces, and
those surfaces are siblings. Use the separate
`reorder-blocked-target-qa` document for blocked-target browser QA so product
surface semantics stay unchanged.

## Browser QA Evidence

2026-07-04:

- QA target: `http://127.0.0.1:4001/` with backend
  `http://127.0.0.1:4011/health`.
- Browser: in-app browser, viewport `1280 x 720`, device pixel ratio `1.25`.
- Baseline: document loaded at `api r3`, order `title`, `summary-columns`,
  `detail-table`, history `0`.
- Action: pointer-dragged `title` near the canvas scroll-root bottom edge.
- PASS: canvas scroll-root `scrollTop` increased from `0` to about `8.8`, body
  scroll stayed `0`, order did not change, and revision stayed `api r3`.
- Action: pointer-dragged `title` after `summary-columns`.
- PASS: order changed to `summary-columns`, `title`, `detail-table`.
- PASS: backend mutation result advanced to `r4`, history became `1`, and
  selection remained on `title`.
- Cleanup: backend dev state was reset and the browser reloaded back to `api r3`
  with history `0`.

2026-07-04 blocked-target QA document:

- QA target: `http://127.0.0.1:4002/` with
  `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa` and backend
  `http://127.0.0.1:4011/`.
- Baseline: document loaded at `api r3`, order `alpha-heading`, `alpha-note`,
  `beta-heading`, `beta-note`, history `0`.
- Action: pointer-dragged `alpha-heading` over cross-parent `beta-heading`.
- PASS: during active drag, `beta-heading` exposed
  `data-reorder-target="blocked"` and the reason
  `Drag/drop reorder is limited to siblings in the same parent.`.
- PASS: after release, order stayed unchanged, revision stayed `api r3`,
  history stayed `0`, and no `mutation-result` status appeared.

2026-07-04 manual stale browser QA:

- QA target: `http://127.0.0.1:4001/` with backend
  `http://127.0.0.1:4011/`.
- Baseline: backend reset to revision `3`, editor tab loaded
  `product-report-vnext-minimal` at `Core: api r3`.
- Setup: an external mutation advanced backend current revision to `4` while
  the editor tab stayed on `api r3`.
- Action: user-visible reorder intent for `title` sent `baseRevision: 3`.
- PASS: backend returned `status: "stale"` with issue code `revision-stale` and
  `core: null`.
- PASS: editor stayed on `Core: api r3`; the local history count was attributed
  to prior exploratory clicks, not an accepted stale mutation, and stale
  reorder must not add a doc change.

## Contract Test Evidence

2026-07-04:

- PASS: blocked drag/drop placement returns `targetState: "blocked"` and the
  reason `Drag/drop reorder is limited to siblings in the same parent.` without
  producing a ready commit plan.
- PASS: noop self-surface placement returns `targetState: "noop"` and the
  reason `Cannot drop a node onto itself.`.
- PASS: canvas blocks expose `data-reorder-target`, `data-reorder-placement`,
  and `data-reorder-reason` so blocked/noop/ready affordances are testable
  without rendering raw graph details as visible copy.
- PASS: backend rejected canvas reorder results preserve the issue code, keep
  runtime state unchanged, keep selection stable, and create no history record.
- PASS: backend stale canvas reorder results preserve `revision-stale`, keep
  runtime state unchanged, keep selection stable, and create no history record.

2026-07-04 keyboard reorder fallback:

- PASS: `Control/Meta + ArrowUp/ArrowDown` maps to adjacent keyboard reorder
  intent; plain arrows and shifted command arrows are ignored.
- PASS: focused paper blocks expose `aria-keyshortcuts` only when the block is
  reorderable.
- PASS: keyboard fallback dispatches through `EditorShell` into
  `reorderNode(..., "keyboard")`, preserving backend transport and revision
  gates rather than applying local document order.
- PASS: keyboard reorder focus decisions wait for the matching applied backend
  result, and canvas focus is restored by `data-node-id` after render.
- LIMIT: manual browser QA confirmed adjacent keyboard reorder works in-page
  but exposed focus loss when the moved node crossed a preview page boundary.
  The focus-restore patch has regression tests, but browser re-check is still
  required. This fallback remains adjacent up/down only and does not add
  cross-parent, empty-container, table-row, or multi-node placement semantics.

## Failure-Path QA Design

2026-07-04:

- PASS: no-hook stale browser recipe is documented in
  `docs/REORDER_FAILURE_PATH_QA.md`; it advances backend revision outside the
  browser app, then triggers reorder intent from the stale editor state.
- PASS: blocked-target browser gap is scoped to the separate
  `reorder-blocked-target-qa` fixture path, not product drag/drop semantics.
- PASS: rejected browser gap is intentionally left to contract tests unless a
  backend-owned, disabled-by-default QA hook is approved later.
- PASS: manual stale browser QA captured a real backend `revision-stale`
  response from the stale tab without a runtime hook.
- PASS: blocked-target browser visual evidence is captured through the
  `reorder-blocked-target-qa` document without changing product fixture
  semantics.
