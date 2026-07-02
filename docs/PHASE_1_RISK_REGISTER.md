# Phase 1 Risk Register

Status: active
Date opened: 2026-07-01
Date updated: 2026-07-02
Scope: FlowDoc vNext Editor Phase 1 UX foundation

## Current Validation Baseline

- `npm run check` passes.
- `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- Dev server responds at `http://127.0.0.1:4001/`.
- Boundary tests keep blocked editor dependencies out of package metadata.
- Runtime source still has no WYSIWYG, `contenteditable`, whole-app `innerHTML`, or direct `@flowdoc/vnext-core` imports outside the intended package dependency.
- Read-only core binding now uses the public `@flowdoc/vnext-core` runtime
  session path for the core product-report fixture through the adapter,
  transport envelope, and working set factory.

## Active Risks

| ID | Risk | Severity | Current Control | Next Control |
| --- | --- | --- | --- | --- |
| R1 | Browser automation became unstable during final visual QA. | Medium | Build/test/HTTP checks still pass. | Add a lighter manual QA checklist before trusting Phase 1 UX as complete. |
| R2 | The core adapter is no longer a static placeholder, but the initial loader still keeps a frontend-placeholder fallback for tests, simulated failures, and fixtures that are not canonical package transport input yet. | Medium | `src/core/coreAdapter.ts` calls the public core runtime session path, and the fallback remains isolated behind `src/core/coreFixtureRead.ts` plus the working set factory loader. | Prefer the `core-product-report-minimal` transport-envelope path for new UI evidence; retire the frontend-placeholder fallback only after replacement fixtures are canonical package transport inputs. |
| R3 | Paper preview uses frontend geometry and CSS transform for zoom; scroll/hit-test can drift later. | High | Paper model has explicit preset dimensions and bounded zoom. | Before hit-test work, add geometry tests for scaled bounds and click target mapping. |
| R4 | `EditorToolbar.tsx` and `PaperPage.tsx` are the first files likely to grow into mixed-responsibility components. | Medium | Runtime state remains outside components. | Split toolbar controls and paper block rendering before adding more commands or block types. |
| R5 | WYSIWYG pressure can start early because the shell now looks more real. | High | AGENTS and boundary tests block `contenteditable` and rich editor frameworks. | Require a written WYSIWYG gate decision before adding draft/input runtime. |
| R6 | Design tokens are local Phase 1 tokens, not a validated design system. | Medium | Palette is restrained and app-specific. | Run a visual QA pass on desktop/mobile before treating tokens as stable. |
| R7 | The editor now reads `@flowdoc/vnext-core` through the adapter, but only for read-only fixture/package binding; backend/API transport and mutation packets are still deferred. | Medium | Core imports remain isolated to `src/core`, and working set tests cover read envelopes, stale guards, caller-supplied canonical packages, and blocked transport cases. | Keep Phase 2/3 work read-only; document the final API envelope before backend transport or mutation bridge work begins. |

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
4. Do not add mutation behavior until command policy and rejection recovery have real tests.
5. Treat scroll, paper geometry, and selection as one coupled risk area; test them together.
6. Prefer one small UX change plus verification over broad visual rewrites.
7. Do not add new frontend-placeholder assumptions when a canonical package
   transport fixture can prove the same behavior.

## Manual QA Checklist

Run this before declaring Phase 1 UX complete:

1. Refresh `http://127.0.0.1:4001/`.
2. Confirm browser body does not scroll.
3. Confirm only the canvas scrolls vertically.
4. Scroll to the top and bottom quickly; confirm no bounce-back or stuck range.
5. Click each visible paper block; confirm selected block, outline, inspector, and status bar agree.
6. Switch A4 and Letter; confirm page dimensions change without layout collapse.
7. Use zoom out, zoom in, and reset; confirm canvas scroll remains usable.
8. Resize below 980px; confirm side panels hide and canvas remains usable.
9. Confirm disabled editing commands look disabled and do not imply WYSIWYG is ready.

## Manual QA Notes

2026-07-01:

- Single-page canvas scroll did not bounce back during user testing.
- This confirms the Phase 1 scroll shell is usable as a foundation.
- Multi-page stress fixture was added after the single-page check.
- Multi-page scroll behavior still needs user-visible browser QA before R1/R3 can be downgraded.

## Exit Criteria

Phase 1 risk can be downgraded only when:

- Manual QA checklist passes on the user-visible browser.
- Selection and paper geometry have tests for scaled click targets.
- Read-only core adapter contract keeps passing with the public core fixture and
  canonical caller-supplied package input.
- `npm run check` remains green after the QA fixes.
