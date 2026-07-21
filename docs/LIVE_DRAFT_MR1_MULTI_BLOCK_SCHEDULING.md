# LIVE-DRAFT-MR1 Multi-Block Scheduling

Status: accepted for a bounded 12-TextBlock real Chrome QA path on 2026-07-21.
Product binding and production remain NO-GO.

## What is accepted

The QA path keeps one initialized MR1 Worker and schedules exact TextBlock
layout one job at a time. Priority order is active-near-edge, visible,
near-viewport, then offscreen. A newer queued revision replaces the older
queued job for the same TextBlock. If an already running older job completes,
its block/revision/content identity is rejected as stale.

Lexical token comparison finds the common prefix/suffix and a bounded dirty
token/render range. Hard breaks, fields, generated page numbers, images, and
run-topology changes are structural and dispatch immediately. Completed token
boundaries are also promoted. These facts are scheduling and invalidation hints
only: they do not own shaping, line breaking, geometry, or pagination. The MR1
engine still performs exact complete layout for the dirty TextBlock.

The controller publishes only after every layout required by the newest
document snapshot is accepted. It then calls Core, through
`src/core/coreAdapter.ts`, for fixed-point document composition and complete
document display-list projection. The previous valid display list remains
visible while work is pending, stale, or locally blocked.

Canvas paints all pages into a scratch bitmap and swaps that bitmap onto the
visible Canvas once. It does not call `measureText`, relayout, or paginate.

## Real Chrome result

The fixture contains 12 ordered TextBlocks with the active mixed-size Text Run
block at index 5 near the bottom of page 1.

- Initial: 2 pages.
- Expanded typing: 3 pages.
- Deletion: 2 pages.
- Delayed revision 4: rejected stale and never painted.
- Queued revision 5: replaced before dispatch by revision 6.
- Blocked revision 7: retains revision 6.
- Same-geometry revision 9: reuses five prefix blocks, recomposes one block and
  one line, then reuses six suffix blocks from exact boundary 6; display-list
  projection reuses 11 lines and validates/projects only the changed line.
- Initial request order: active, visible neighbors, near-viewport neighbors,
  then offscreen blocks.
- Final counters: 29 scheduled, 28 started, 27 applied, one stale, one queued
  replacement, zero failures, 16 complete composition/projection publications,
  and one intentionally blocked input.
- Chrome made zero Backend-like requests.

Ten warm active-block edits observed:

- main-thread composition + projection + atomic paint: 5.7 ms p50 / 6.8 ms
  p95;
- end-to-end: 7.3 ms p50 / 8.5 ms p95;
- Worker layout over all 28 requests: 2.1 ms p50 / 19.7 ms p95; and
- Canvas paint over 16 published snapshots: 1.0 ms p50 / 3.8 ms p95.

The accepted QA frame gate is 16.7 ms for the measured warm main-thread slice.
This is not a universal product budget: it excludes product React work,
selection/caret/IME, large viewport stacks, tables, images, and background
contention.

Primary evidence:

- `src/editor/liveDraft/liveDraftMultiBlockImpact.ts`;
- `src/editor/liveDraft/liveDraftMultiBlockScheduler.ts`;
- `src/editor/liveDraft/liveDraftMultiBlockController.ts`;
- `src/editor/liveDraft/liveDraftMultiBlockCanvasPainter.ts`;
- `src/qa/liveDraftMr1MultiBlockEvidencePage.ts`;
- `src/fixtures/live-draft-mr1-multi-block-scheduling.v1.json`; and
- `src/tests/liveDraftMr1MultiBlockEvidence.test.ts`.

## Explicitly not accepted

- product Editor binding or Backend/API transport;
- partial shaping/reflow inside the dirty TextBlock;
- long-document page virtualization or memory budget;
- IME/composition-event and caret/selection integration;
- tables, columns, images, repeated headers, and auto-fit column width; or
- Canvas/PDF glyph-outline or pixel parity.
