# Phase 2-5 Closeout

Status: user-reviewed with follow-up
Date: 2026-07-02
Branch: `codex/crb-closeout-risk-register`
Scope: FlowDoc vNext Editor paper, viewport, render partition, and selection/hit-test slices

## Summary

Phases 2 through 5 now have a reviewable frontend foundation:

- Phase 2 locks A4/Letter paper geometry behind the paper model.
- Phase 3 records canvas scroll-root facts without writing scroll position back
  during normal user scroll.
- Phase 4 partitions canvas rendering into scoped components and keeps
  `EditorShell` as a coordinator.
- Phase 5 routes canvas selection through hit-test boundaries and draws a
  pointer-free selected-node overlay from DOM measurement facts.

This closeout does not claim pagination, text wrapping, WYSIWYG, mutation, or
export truth.

Later note, 2026-07-04: backend-backed read boot and the first visible duplicate
mutation slice were added after this closeout. This document remains the
Phase 2-5 runtime closeout snapshot, not the current mutation status.

## Phase Evidence

| Phase | Evidence | Status |
| --- | --- | --- |
| Phase 2 Real Paper | `src/editor/paper/paperGeometry.ts`, `src/tests/paperGeometry.test.ts` | PASS |
| Phase 3 Stable Canvas Viewport | `src/components/canvas/CanvasScrollRoot.tsx`, `src/editor/viewport/viewportMeasurement.ts`, `src/tests/viewportScrollRoot.test.ts` | PASS |
| Phase 4 Render Partition | `src/editor/render/canvasRenderModel.ts`, `src/editor/runtime/editorCanvasRenderView.ts`, `src/tests/renderPartition.test.ts` | PASS |
| Phase 5 Selection / Hit Test | `src/editor/selection/hitTest.ts`, `src/editor/selection/selectionOverlay.ts`, `src/tests/selectionHitTest.test.ts`, `src/tests/selectionOverlay.test.ts` | PASS |

## Behavior Confirmed

- Document stack height comes from paper model facts, not visible content height.
- `CanvasScrollRoot` is the scroll container and records viewport facts.
- Normal scroll does not use `scrollTop` write-back, `scrollTo`, or
  `scrollIntoView`.
- `EditorShell` no longer projects preview pages directly.
- Canvas rendering is split across surface, stage, meta, page stack, page,
  block, and overlay components.
- Selection-only commands preserve the existing editor view object.
- Canvas block clicks resolve through `hitTest.ts` before dispatching selection.
- Selected block, outline, inspector, and status read the same selected node id.
- Selected-node overlay is measured relative to `canvas-stage`.
- Overlay stays pointer-free and does not own click behavior.

## Browser QA Evidence

2026-07-02 in-app browser QA against `http://127.0.0.1:4001/`:

- HTTP/dev server returned 200.
- Body did not scroll while the canvas scroll root did.
- Fast top-to-bottom and reverse scroll reached stable scroll positions:
  bottom `scrollTop` was about `2428.8` with max `2429`, and reverse scroll
  returned to `0`.
- Canvas click on the available `detail-table` block selected the same node in
  canvas, outline, inspector, and status.
- Canvas click after real scroll on `detail-cell-b-text` selected the same node
  in canvas, outline, inspector, and status.
- Selected-node overlay appeared for `detail-table`.
- Selected-node overlay appeared after click-after-scroll.
- Overlay rect matched the selected block rect within about `0.01px`.
- `.canvas-overlay-layer` computed `pointer-events: none`.
- Letter preset click updated canvas meta to `3 preview pages / Letter / 816 x
  1056px`.
- Responsive QA at `900 x 720` hid outline and side panels while the canvas
  remained scrollable.

## User Review Notes

2026-07-02 user review:

- Result: overall Phase 2-5 runtime behavior passed user review.
- PASS: the browser-facing scroll, paper, selection, and overlay behavior was
  acceptable enough to move out of implementation hardening.
- FOLLOW-UP: node relationships still feel strange in the product surface.

The node relationship concern is not treated as a Phase 2-5 runtime blocker.
It is a presentation/modeling follow-up: the current UI still exposes too many
structural nodes such as columns, table rows, and table cells as generic canvas
blocks and outline items. That is useful evidence for the normalized runtime
graph, but it is not yet the intended product-facing document hierarchy.

The next design pass should separate:

- canonical structural nodes;
- product-facing outline nodes;
- canvas-selectable block nodes;
- future table/cell editing targets;
- inspector-only relationship facts.

## Checks Run

- `npx vitest run src/tests/renderPartition.test.ts`
- `npx vitest run src/tests/selectionHitTest.test.ts`
- `npx vitest run src/tests/selectionOverlay.test.ts`
- `npx vitest run src/tests/selectionOverlay.test.ts src/tests/selectionHitTest.test.ts src/tests/viewportScrollRoot.test.ts`
- `npm run check`
- `npm audit --audit-level=moderate`

Latest full check result at closeout:

- type-check: PASS
- Vitest: PASS, 19 files / 89 tests
- build: PASS
- npm audit: PASS, 0 vulnerabilities

## Risks Left

- Browser QA should still be manually reviewed by the user before downgrading
  all visual/runtime risks.
- Node relationship presentation still needs a product-facing projection; the
  current surface exposes structural graph details too directly.
- Overlay measurement is DOM-based interaction truth, not core layout truth.
- Content mutation, live layout, and export readiness are still deferred.
- Text wrapping, table row height, caret behavior, and draft editing are still
  intentionally outside this slice.
- Long-document virtualization is not implemented yet.

## Intentionally Not Changed At Closeout

- No WYSIWYG.
- No `contenteditable`.
- No text caret.
- No real pagination.
- No final text wrapping truth.
- No table row height truth.
- No mutation bridge at the time of this closeout.
- No backend/API transport at the time of this closeout.
- No export/artifact truth.

## Review Checklist

Use this checklist when reviewing the closeout in the browser:

1. Refresh `http://127.0.0.1:4001/`.
2. Confirm the browser body does not scroll.
3. Confirm only the canvas scroll root scrolls.
4. Scroll quickly to bottom and back to top.
5. Click blocks after scrolling; confirm canvas, outline, inspector, and status agree.
6. Confirm the selected-node overlay follows the selected block.
7. Confirm the overlay does not block selecting another block.
8. Change A4/Letter and confirm stack geometry stays sane.
9. Change zoom and confirm canvas scroll and selection still work.
10. Resize below 980px and confirm the canvas remains usable.
