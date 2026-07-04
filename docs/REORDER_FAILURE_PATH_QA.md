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

## No-Hook Stale Browser Recipe

This recipe uses the real backend revision gate. It does not require a product
runtime hook.

1. Restart `flowdoc-vnext-backend` so
   `product-report-vnext-minimal` is at revision `3`.
2. Load `http://127.0.0.1:4001/` and confirm the editor status bar shows
   `Core: api r3`, order `title`, `summary-columns`, `detail-table`, and
   `History: 0`.
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

## Blocked Target Browser Gap

The current canonical product fixture renders only these canvas operation
surfaces:

- `title`
- `summary-columns`
- `detail-table`

Those surfaces are siblings under the same zone, so a true cross-parent blocked
target cannot be shown in browser QA without changing fixture coverage or
adding a controlled QA document. Do not fake this by allowing cross-parent
drop, mutating presentation ownership, or making internal table/column nodes
primary canvas targets.

## Preferred Fixture Direction

Add a canonical QA fixture only when cross-repo scope is approved:

1. In core, add a small canonical vNext package fixture with two visible canvas
   surfaces under different operation parents, such as two zones or sections.
2. In backend, seed that package as a separate QA document through repository
   setup, not by changing product mutation semantics.
3. In editor, load that QA document through configuration or an explicit QA
   harness, not through default product startup.
4. Browser QA then drags a reorderable surface over a surface in the other
   parent and expects:
   - `data-reorder-target="blocked"`;
   - a machine-readable `data-reorder-reason`;
   - no backend mutation request;
   - no visible raw graph details as primary product copy.

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
