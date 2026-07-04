# Phase 1 Risk Register

Status: active
Date opened: 2026-07-01
Date updated: 2026-07-04
Scope: FlowDoc vNext Editor Phase 1 UX foundation

## Current Validation Baseline

- `npm run check` passes.
- `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- Dev server responds at `http://127.0.0.1:4001/`.
- Boundary tests keep blocked editor dependencies out of package metadata.
- Boundary tests scan source imports so direct core package access stays behind
  `src/core`, direct package imports stay at `src/core/coreAdapter.ts`, and core
  adapter read submodules stay internal to `src/core`.
- Runtime source still has no WYSIWYG, `contenteditable`, whole-app `innerHTML`, or direct `@flowdoc/vnext-core` imports outside the intended package dependency.
- Read-only core binding now uses the public `@flowdoc/vnext-core` runtime
  session path for the core product-report fixture through the adapter,
  transport envelope, and working set factory.
- Backend-backed reads and inspector-visible duplicate/delete/reorder mutations
  now use the editor backend transport/revision boundary instead of direct
  browser-side core mutation.

## Active Risks

| ID | Risk | Severity | Current Control | Next Control |
| --- | --- | --- | --- | --- |
| R1 | Browser automation became unstable during final visual QA. | Medium | Build/test/HTTP checks still pass. | Add a lighter manual QA checklist before trusting Phase 1 UX as complete. |
| R2 | The core adapter is no longer a static placeholder, but the initial loader still keeps a frontend-placeholder fallback for tests, simulated failures, and fixtures that are not canonical package transport input yet. | Medium | `src/core/coreAdapter.ts` calls the public core runtime session path, and the fallback remains isolated behind `src/core/coreFixtureRead.ts` plus the working set factory loader. | Prefer the `core-product-report-minimal` transport-envelope path for new UI evidence; retire the frontend-placeholder fallback only after replacement fixtures are canonical package transport inputs. |
| R3 | Paper preview uses frontend geometry and CSS transform for zoom; scroll/hit-test can drift later. | High | Paper model, scroll-root facts, hit-test boundary, and selected overlay now have focused tests plus browser QA evidence. | User-visible review should confirm scroll/zoom/selection behavior before downgrading. |
| R4 | `EditorToolbar.tsx` and `PaperPage.tsx` are the first files likely to grow into mixed-responsibility components. | Medium | Paper block rendering is split into `PaperBlock`, `PaperPage`, and `PaperPageStack`; canvas render partitions are split through `CanvasStage` and overlay components. | Split toolbar controls before adding more toolbar commands. |
| R5 | WYSIWYG pressure can start early because the shell now looks more real. | High | AGENTS and boundary tests block `contenteditable` and rich editor frameworks. | Require a written WYSIWYG gate decision before adding draft/input runtime. |
| R6 | Design tokens are local Phase 1 tokens, not a validated design system. | Medium | Palette is restrained and app-specific. | Run a visual QA pass on desktop/mobile before treating tokens as stable. |
| R7 | Backend/API transport and inspector structural mutation controls now exist, but rejection recovery and a real mutation queue are still narrow. | Medium | Core imports remain isolated to `src/core`; backend integration tests cover read envelopes, mutation request building, surface normalization, stale result guards, runtime apply, history recording, and canvas reorder rejected/stale recovery. | Keep additional mutations behind command policy, backend revision gates, and explicit recovery tests before exposing more commands. |
| R8 | Direct internal core submodule imports could bypass the `coreAdapter` facade as CRB files grow. | High | `src/tests/boundary.test.ts` scans source imports for direct core package access and internal read submodule access outside `src/core`. | Keep this scan current whenever new adapter submodules are added. |
| R9 | Partial core read results may look healthy in the UI if status surfaces do not distinguish `fresh`, `partial`, and `blocked`. | Medium | Working set envelopes preserve status and controlled failures. | Status/diagnostics UI must show read status clearly before API-backed reads or async result UX. |
| R10 | Manual QA can become anecdotal if user-visible browser checks are not recorded with a repeatable result format. | Medium | Checklist exists; Phase 2-5 closeout records browser QA evidence in `docs/PHASE_2_TO_5_CLOSEOUT.md`. | Continue recording date, browser, viewport size, pass/fail, notes, and blocking issue for each manual QA pass. |
| R11 | Phase 1 UX can regress without lightweight performance markers for scroll and selection responsiveness. | Low | Runtime tests cover ownership; browser QA now records stable scroll and selection observations. | Add simple manual timing notes or dev diagnostics before treating long-document behavior as stable. |
| R12 | Inspector structural controls can be mistaken for final reorder UX. | High | `docs/COMMAND_UX_GATE.md` marks them as interim command harness controls, `docs/DRAG_DROP_REORDER_CONTRACT.md` owns the drag/drop contract, `src/editor/commands/reorderPlacement.ts` gates same-parent placement planning, `src/app/useCanvasReorderDrag.ts` owns transient drag state, `src/editor/interaction/canvasReorderAutoScroll.ts` owns canvas-root auto-scroll, focused canvas blocks expose adjacent keyboard fallback with post-apply focus restore, blocked/noop/ready target states are data-addressable with reasons, rejected/stale canvas reorder recovery keeps state/history stable, and delete now requires confirmation while undo is unavailable. | Re-check browser keyboard fallback across page boundaries and capture rejected browser recovery evidence before declaring reorder UX passed. |

## Priority Gates

P0 before closing Phase 1:

- R1 browser QA instability.
- R3 paper geometry, scroll, and future hit-test drift.
- R5 WYSIWYG pressure.

P1 before adding new product behavior:

- R2 frontend-placeholder fallback discipline.
- R4 toolbar and paper component responsibility split.
- R7 backend mutation recovery/queue limitations.
- R8 adapter facade import boundary.
- R12 interim structural controls and drag/drop readiness.

P2 polish and evidence quality:

- R6 design tokens.
- R9 partial read status clarity.
- R10 manual QA result format.
- R11 lightweight performance markers.

## Core Binding Fallback Intent

`loadInitialCoreWorkingSet(...)` prefers the core fixture transport-envelope path
for `core-product-report-minimal` when no simulated failure or missing-data flag
is requested. The frontend-placeholder fallback intentionally remains because
some Phase 0/1 tests and QA fixtures still exercise editor-owned placeholder
seed data or controlled partial/blocked read results rather than canonical
package transport input.

This fallback is not canonical document truth, not a permission to add new UI
assumptions, and not a replacement for the public core runtime session path.
New product-editor evidence should use canonical package transport input unless
the test is explicitly proving fallback or failure behavior.

## Guardrails For The Next Work Block

1. Do not add WYSIWYG, `contenteditable`, ProseMirror, Slate, TipTap, or DOM HTML as document truth.
2. Do not add direct core imports outside `src/core`.
3. Do not let `EditorShell` own behavior; keep it as composition only.
4. Do not add new mutation behavior outside command policy, backend revision gates, and focused rejection/recovery tests.
5. Treat scroll, paper geometry, and selection as one coupled risk area; test them together.
6. Prefer one small UX change plus verification over broad visual rewrites.
7. Do not add new frontend-placeholder assumptions when a canonical package
   transport fixture can prove the same behavior.
8. Do not add draft/input runtime until a written WYSIWYG gate exists.
9. Treat Inspector structural controls as command plumbing evidence only until
   `docs/COMMAND_UX_GATE.md` and `docs/DRAG_DROP_REORDER_CONTRACT.md` pass
   review.

## Manual QA Checklist

Run this before declaring Phase 1 UX complete:

1. Refresh `http://127.0.0.1:4001/`.
2. Confirm browser body does not scroll.
3. Confirm only the canvas scrolls vertically.
4. Scroll to the top and bottom quickly; confirm no bounce-back or stuck range.
5. Click visible paper blocks across the first, middle, and last preview page; confirm selected block, outline, inspector, and status bar agree.
6. Switch A4 and Letter; confirm page dimensions change without layout collapse.
7. Use zoom out, zoom in, and reset; confirm canvas scroll remains usable.
8. Resize below 980px; confirm side panels hide and canvas remains usable.
9. With the backend running, duplicate a selected duplicable node from the inspector; confirm the selected copy appears and document revision increments.
10. Move a middle inspector node up/down; confirm order, selected node, and revision update.
11. Delete a deletable inspector node; confirm the first click asks for confirmation, cancel leaves the node unchanged, confirm deletes the node, selection recovers to a valid node, and revision updates.
12. Drag a same-parent canvas block to a new location; confirm preview appears, drop updates order through backend mutation, selected node stays valid, and revision updates only after drop.
13. While dragging near the canvas top/bottom edge, confirm only the canvas scrolls and page body stays fixed.
14. Confirm disabled editing commands look disabled and do not imply WYSIWYG is ready.
15. Reload after switching zoom and paper preset; confirm the initial state is sane.
16. Click the selected block again; confirm no unexpected toggle or visual drift.
17. Scroll while side panels are hidden below 980px; confirm canvas width and scroll remain usable.

Record each manual QA pass with:

- date;
- browser;
- viewport size;
- result: pass/fail;
- notes;
- blocking issue, if any.

## Manual QA Notes

2026-07-01:

- Single-page canvas scroll did not bounce back during user testing.
- This confirms the Phase 1 scroll shell is usable as a foundation.
- Multi-page stress fixture was added after the single-page check.
- Multi-page scroll behavior still needs user-visible browser QA before R1/R3 can be downgraded.

2026-07-02:

- QA pass: in-app browser automation against `http://127.0.0.1:4001/`.
- Viewport: 1280 x 720.
- Result: partial pass, blocked before Phase 1 downgrade.
- Baseline: `npm run check` passed before browser QA; HTTP check returned 200.
- PASS: body did not scroll; canvas was the scroll container.
- PASS: canvas fast scroll reached top and bottom without bounce-back or stuck
  range; `scrollTop` stayed at 0 after upward settle and at max after downward
  settle.
- PASS: selected block, outline, inspector, and status agreed after clicks on
  first-page, middle-page, and last-page visible blocks.
- PASS: clicking the already selected first-page block again kept selection
  stable without toggle or visual drift.
- PASS: A4 and Letter controls changed page dimensions without layout collapse;
  zoom in, zoom out, and reset kept canvas scrolling usable.
- PASS: disabled edit commands were visible as disabled and did not imply
  WYSIWYG readiness.
- BLOCKED: browser automation timed out during reload sanity checking, so
  reload-after-paper/zoom could not be trusted as complete evidence.
- BLOCKED: below-980px side-panel-hidden scroll QA was not completed because the
  browser automation session reset during reload recovery.
- TOOLING NOTE: role-locator click for `Letter` timed out, but coordinate click
  against the visible toolbar control changed state correctly. Treat this as R1
  browser automation instability, not an app behavior failure.
- Decision: do not downgrade R1 or R3 yet. Phase 2 paper work may proceed, but
  selection/hit-test work still requires full manual browser QA plus scaled
  geometry tests.

2026-07-02 Phase 2-5 closeout evidence:

- Closeout doc: `docs/PHASE_2_TO_5_CLOSEOUT.md`.
- QA pass: in-app browser automation against `http://127.0.0.1:4001/`.
- Result: review-ready pass, pending user-visible confirmation.
- PASS: paper geometry, viewport scroll facts, render partition, hit-test, and
  selection overlay tests were added and passed.
- PASS: browser click on the available `detail-table` canvas block selected the
  same node in canvas, outline, inspector, and status.
- PASS: real scroll reached bottom at about `2428.8` of max `2429`, then
  reverse scroll returned to `0`.
- PASS: click-after-scroll on `detail-cell-b-text` selected the same node in
  canvas, outline, inspector, and status.
- PASS: selected-node overlay matched selected block rects within about `0.01px`.
- PASS: overlay layer computed `pointer-events: none`.
- PASS: Letter preset updated canvas meta to `3 preview pages / Letter / 816 x
  1056px`.
- PASS: responsive QA at `900 x 720` hid side panels while canvas scrolling
  stayed available.
- USER REVIEW: overall Phase 2-5 runtime behavior passed, with one follow-up:
  node relationships still feel strange because the surface exposes structural
  graph details too directly.
- Decision: keep R1/R3 active until the node relationship presentation gap is
  triaged, but Phase 2-5 runtime behavior has enough recorded evidence for
  closeout review.

2026-07-04 canvas reorder hardening evidence:

- QA pass: in-app browser automation against `http://127.0.0.1:4001/`.
- Viewport: 1280 x 720, device pixel ratio `1.25`.
- Baseline: backend health returned ready, editor loaded `api r3`, order
  `title`, `summary-columns`, `detail-table`, history `0`, body scroll `0`,
  and canvas scroll-root `0`.
- PASS: dragging `title` near the bottom edge of the canvas scroll root moved
  only the canvas scroll root from `0` to about `8.8`; body scroll stayed `0`,
  order stayed unchanged, and revision stayed `api r3`.
- PASS: dragging `title` after `summary-columns` reordered the canvas to
  `summary-columns`, `title`, `detail-table`; backend advanced to
  `mutation-result r4`, history became `1`, and selection remained on `title`.
- Cleanup: backend dev state was restarted and the editor reloaded back to
  `api r3`, order `title`, `summary-columns`, `detail-table`, history `0`.
- Decision: same-parent pointer drop, canvas-root auto-scroll, and
  blocked-target hover have enough evidence for this slice. Keep R12 active for
  rejected browser recovery evidence, browser keyboard fallback confirmation,
  and broader placement semantics.

2026-07-04 canvas reorder failure-path contract evidence:

- QA scope: focused Vitest coverage for drag/drop planner state and backend
  mutation apply recovery.
- PASS: blocked target state is derived from a cross-parent placement fixture
  as `targetState: "blocked"` with a machine-readable reason; noop self-surface
  target state is likewise derived with a reason.
- PASS: `PaperBlock` exposes `data-reorder-target`, `data-reorder-placement`,
  and `data-reorder-reason` for ready/noop/blocked affordance testing without
  showing raw hierarchy details as primary product text.
- PASS: backend rejected canvas reorder results preserve issue code, leave
  editor runtime state unchanged, keep selection stable, and do not create
  history records.
- PASS: backend stale canvas reorder results preserve `revision-stale`, leave
  editor runtime state unchanged, keep selection stable, and do not create
  history records.
- PASS: browser blocked-target visual QA is covered by the separate
  `reorder-blocked-target-qa` document and captured data attributes during
  active drag.

2026-07-04 reorder failure-path QA design:

- Design doc: `docs/REORDER_FAILURE_PATH_QA.md`.
- PASS: stale browser QA can be set up without a runtime hook by loading the
  editor at backend revision `3`, advancing the backend to revision `4` through
  an external valid mutation, then triggering reorder intent from the stale
  browser state.
- PASS: blocked-target browser QA is explicitly scoped to the canonical
  `reorder-blocked-target-qa` fixture with cross-parent visible canvas
  surfaces.
- PASS: rejected browser QA is not forced through inconsistent editor/core
  capabilities; rejected recovery remains contract-test evidence unless a
  backend-owned QA hook is approved later.
- LIMIT: in-app browser automation reached the stale setup but did not dispatch
  a visible reorder mutation from the stale tab, so no browser stale PASS is
  claimed from this attempt.

2026-07-04 manual stale browser QA evidence:

- PASS: backend was reset to `product-report-vnext-minimal` revision `3`, then
  an external setup mutation advanced backend current revision to `4` while the
  editor tab stayed on `Core: api r3`.
- PASS: a user-visible reorder intent for `title` sent `baseRevision: 3` and
  received `status: "stale"` with issue code `revision-stale`.
- PASS: stale response had `core: null`, so the backend revision gate blocked
  before core mutation.
- PASS: editor remained on `Core: api r3`; the local history count was from
  prior exploratory local clicks, not from an accepted stale mutation. The
  status bar now separates local history from doc changes for future QA.

2026-07-04 keyboard reorder fallback evidence:

- PASS: focused `PaperBlock` handles `Control/Meta + ArrowUp/ArrowDown` only
  when the block is reorderable; plain arrows and shifted command arrows are
  ignored.
- PASS: the fallback dispatches through `EditorShell` into
  `reorderNode(..., "keyboard")`, so keyboard reorder uses the existing backend
  transport and revision gate rather than local document mutation.
- PASS: focused tests cover the keyboard action mapper and component wiring,
  including the `keyboard` source.
- PASS: keyboard reorder focus restore waits for the matching applied backend
  result, then focuses the moved canvas node by `data-node-id` after render.
- LIMIT: manual browser QA confirmed adjacent keyboard reorder works in-page
  but exposed focus loss when the moved node crossed a preview page boundary.
  The focus-restore patch has regression tests, but browser re-check is still
  required. The fallback is adjacent up/down only and does not add cross-parent,
  empty-container, table-row, or multi-node placement semantics.

2026-07-04 reorder blocked-target fixture evidence:

- PASS: core owns
  `fixtures/reorder-blocked-target-qa.flowdoc.json` as canonical fixture data
  with two visible canvas surfaces under different parents.
- PASS: backend seeds `reorder-blocked-target-qa` as a separate document at
  revision `3`.
- PASS: editor backend config accepts
  `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa`, and integration tests
  prove the QA read path plus cross-parent blocked planner state.
- PASS: browser QA loaded that document at `api r3`, dragged `alpha-heading`
  over `beta-heading`, captured `data-reorder-target="blocked"` with the
  same-parent reason, and confirmed revision/history/order stayed unchanged
  after release.

## Exit Criteria

Phase 1 risk can be downgraded only when:

- Manual QA checklist passes on the user-visible browser.
- Selection and paper geometry have tests for scaled click targets.
- Read-only core adapter contract keeps passing with the public core fixture and
  canonical caller-supplied package input.
- Core boundary scan tests pass after adapter splits.
- `npm run check` remains green after the QA fixes.
