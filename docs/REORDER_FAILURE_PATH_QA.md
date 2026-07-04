# Reorder Failure Path QA

Status: active QA design
Date: 2026-07-04
Scope: FlowDoc vNext editor reorder failure-path evidence

## Goal

Prove reorder failure paths without widening product semantics or creating a
pointer-only mutation route. Failure-path QA must preserve the normal flow:

```text
editor command intent
  -> backend mutation request with baseRevision
  -> backend revision gate
  -> backend rejected/stale envelope
  -> editor stale-gated runtime apply
  -> recoverable UI status with stable selection/history
```

## Current Evidence

- Happy-path canvas drag/drop browser QA exists in
  `docs/DRAG_DROP_REORDER_CONTRACT.md`.
- Contract tests cover blocked/noop target state in
  `src/tests/canvasReorderDrag.test.ts`.
- Contract tests cover rejected/stale mutation recovery in
  `src/tests/backendIntegration.test.ts`.
- Backend service tests cover stale and rejected mutation envelopes in
  `flowdoc-vnext-backend/src/tests/mutationService.test.ts`.
- Core now includes `fixtures/reorder-blocked-target-qa.flowdoc.json`, a
  canonical two-section fixture with visible cross-parent canvas surfaces.
- Backend seeds `reorder-blocked-target-qa` as a separate QA document at
  revision `3`.
- Editor backend config can load that QA document with
  `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa`; integration tests prove
  the read path and blocked placement planner state.
- Browser QA captured the blocked hover state from that QA document without a
  backend mutation.
- Manual browser QA captured a stale reorder response from a user-visible tab
  without adding a hook.

## No-Hook Stale Browser Recipe

This recipe uses the real backend revision gate. It does not require a product
runtime hook.

1. Restart `flowdoc-vnext-backend` so
   `product-report-vnext-minimal` is at revision `3`.
2. Load `http://127.0.0.1:4001/` and confirm the editor status bar shows
   `Core: api r3`, order `title`, `summary-columns`, `detail-table`,
   `Local history: 0`, and `Doc changes: 0`.
3. From outside the browser app, POST a valid mutation to advance the backend:

```json
{
  "baseRevision": 3,
  "documentId": "product-report-vnext-minimal",
  "operation": {
    "kind": "node.duplicate",
    "nodeId": "summary-columns"
  },
  "reason": "browser-stale-qa-setup",
  "requestId": "browser-stale-qa-setup",
  "source": "system"
}
```

4. Confirm `GET /documents/product-report-vnext-minimal` returns revision `4`.
5. Without reloading the browser app, trigger a reorder intent from the stale
   editor state. Prefer a canvas drop; the Inspector move buttons are an
   acceptable fallback for testing the shared backend mutation status path.
6. Expected editor behavior:
   - backend returns a stale mutation envelope with issue code
     `revision-stale`;
   - editor document order remains the stale local order until an explicit
     refresh/reload;
   - selection remains valid;
   - history remains unchanged;
   - Inspector action status reports a recoverable failed command.
7. Restart the backend before any following browser QA so the fixture returns
   to revision `3`.

## 2026-07-04 Browser Attempt

- Baseline browser state reached `api r3`, history `0`, and the expected order.
- External backend mutation advanced the backend to revision `4`.
- In-app browser automation did not dispatch a visible canvas drop or Inspector
  reorder mutation from the stale tab: the editor stayed at `api r3`, history
  `0`, and no action status appeared.
- Result: no browser stale PASS is claimed from this attempt. The no-hook stale
  recipe remains valid for manual/user-visible QA, but automation needs a more
  reliable interaction path before it can be recorded as pass evidence.

## 2026-07-04 Manual Stale Browser QA

- QA target: `http://127.0.0.1:4001/` with backend
  `http://127.0.0.1:4011/`.
- Baseline: backend was reset to
  `product-report-vnext-minimal` revision `3`, then the editor tab loaded
  `Core: api r3`.
- Setup: an external backend mutation advanced the same document to revision
  `4` while the editor tab remained on `api r3`.
- Action: from the stale editor tab, a reorder intent for `title` was sent with
  `baseRevision: 3`.
- PASS: backend returned `status: "stale"`, issue code `revision-stale`, and
  message `baseRevision 3 does not match current revision 4`.
- PASS: the stale response had `core: null`, confirming the backend revision
  gate blocked before core mutation.
- PASS: the editor remained on `Core: api r3`; the observed local history count
  came from prior exploratory clicks, not from an accepted stale mutation. Under
  the status bar split, those clicks are local history while stale reorder must
  not add a doc change.

## Blocked Target Product Fixture Boundary

The default product fixture still renders only these canvas operation surfaces:

- `title`
- `summary-columns`
- `detail-table`

Those surfaces are siblings under the same zone. A true cross-parent blocked
target must use the separate QA document
`reorder-blocked-target-qa`, not product fixture changes or widened drop
semantics. The browser evidence below covers that QA path while keeping product
fixture behavior unchanged.

## Canonical QA Fixture Status

The approved cross-repo fixture direction is implemented:

1. Core fixture:
   `flowdoc-vnext-core/fixtures/reorder-blocked-target-qa.flowdoc.json`.
2. Backend seed document: `reorder-blocked-target-qa` at revision `3`.
3. Editor configuration:
   `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa`.
4. Browser QA drags a reorderable surface over a surface in the other
   parent and expects:
   - `data-reorder-target="blocked"`;
   - a machine-readable `data-reorder-reason`;
   - no backend mutation request;
   - no visible raw graph details as primary product copy.

## 2026-07-04 Blocked Target Browser QA

- QA target: `http://127.0.0.1:4002/` with
  `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa` and backend
  `http://127.0.0.1:4011/`.
- Baseline: document loaded from backend as `reorder-blocked-target-qa` at
  `api r3`, history `0`, and paper order `alpha-heading`, `alpha-note`,
  `beta-heading`, `beta-note`.
- Action: pointer-dragged `alpha-heading` over the cross-parent
  `beta-heading` paper block.
- PASS: during active drag, `beta-heading` exposed
  `data-reorder-target="blocked"` and
  `data-reorder-reason="Drag/drop reorder is limited to siblings in the same parent."`.
- PASS: after release, paper order stayed unchanged, status stayed `api r3`,
  history stayed `0`, and no `mutation-result` status appeared.

## Rejected Browser Gap

The normal UI planner prevents invalid reorder requests before they are sent.
That is correct product behavior. A browser-level rejected mutation should not
be forced by creating inconsistent capabilities where the editor says a reorder
is allowed but core rejects it. Keep rejected recovery covered by contract
tests unless a backend-owned, disabled-by-default QA hook is explicitly added
later.

## Do Not Add

- No cross-parent moves as a side effect of QA.
- No pointer-only mutation route.
- No hidden app-global function that bypasses command policy.
- No fixture that lies about core/editor capability agreement.
- No visible raw parent/zone/table graph reason as the primary product model.
