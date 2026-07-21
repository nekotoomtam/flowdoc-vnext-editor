# Live Draft MR1 Rapid-Edit Lifecycle

Status: accepted for one bounded real Chrome QA sequence on 2026-07-21.
The latest-revision gate, stale-completion rejection, last-valid retention, and
Canvas publication policy are proven for the MR1 multi-run path. Product
binding and production remain NO-GO.

## Policy

Live typing uses two different mechanisms:

1. Debounce prevents work that has not started yet. In this evidence,
   revisions 2 and 3 never reach the Worker.
2. Revision identity protects work that has already started. Revision 4 is
   given an advisory cancellation, deliberately completes after revision 5,
   and is counted as stale without reaching Core projection or Canvas.

Cancellation is an optimization, not a correctness boundary. Correctness
comes from matching document revision, content fingerprint, and request id
before an accepted layout may replace `lastValid`.

## Real Browser Sequence

```text
revision 1 accepted and painted
  -> revisions 2, 3 coalesced before dispatch
  -> revision 4 dispatched slowly
  -> revision 5 supersedes 4 and is painted
  -> late revision 4 rejected as stale
  -> revision 6 locally blocked; revision 5 remains visible
  -> revision 7 accepted and painted
```

The exact observed counters were:

| Counter | Value |
| --- | ---: |
| Scheduled revisions | 6 |
| Worker requests | 4 (`1, 4, 5, 7`) |
| Applied/painted revisions | 3 (`1, 5, 7`) |
| Advisory cancellations | 1 (revision `4`) |
| Stale completions rejected | 1 (revision `4`) |
| Blocked local inputs | 1 (revision `6`) |

While revision 4 and then 5 were pending, the Canvas retained revision 1.
After revision 5 became current, both the late revision-4 completion and the
blocked revision 6 left revision 5 visible. Recovery revision 7 replaced it
only after its own accepted Worker result and Core display list were ready.

The final 794 x 1,123 Canvas contained 10,360 non-white pixels with PNG data
digest `277da70d7fc1ff49087b5a7fdbc80185302fbc5c1b8dccac6fed36dcdd87b8e8`.
Chrome observed zero Backend-like requests.

## Controlled Reordering

The QA Worker performs real MR1 WASM Rustybuzz/ICU4X layout for every dispatched
revision. It delays only delivery of the already-computed revision-4 response
by 120 ms so that the stale ordering is deterministic. Revision 5 is delayed
by 5 ms. These artificial delays are evidence instrumentation and are not a
product scheduler or a performance simulation.

The retained end-to-end and Worker timings are observations from this one QA
run, not accepted budgets. The timing sequence also excludes React
reconciliation, multiple dirty blocks, pagination, and product input events.

## Boundaries

- `liveDraftMultiRunController.ts` owns debounce, revision identity,
  last-valid state, and the Core projection publication gate.
- The controller reaches Core only through `src/core/coreAdapter.ts`.
- The lifecycle Worker imports the MR1 Worker runtime package and never imports
  Core directly.
- The Canvas painter consumes an accepted display list; it measures no text and
  performs no relayout.
- A blocked latest revision changes status and message but does not erase the
  last-valid display list.
- Existing product controller, product Canvas, Backend/API, default measurer,
  whole-document composition, pagination, and published output are unchanged.

## Evidence

- `src/fixtures/live-draft-mr1-rapid-edit-lifecycle.v1.json`;
- `src/editor/liveDraft/liveDraftMultiRunController.ts`;
- `src/qa/liveDraftMr1LifecycleEvidence.worker.ts`;
- `src/qa/liveDraftMr1LifecycleEvidencePage.ts`;
- `qa/live-draft-mr1-lifecycle-evidence.html`;
- `scripts/run-live-draft-mr1-evidence.mjs`;
- `src/tests/liveDraftMultiRunController.test.ts`; and
- `src/tests/liveDraftMr1LifecycleEvidence.test.ts`.

Regenerate all retained MR1 evidence with `npm run evidence:live-draft-mr1`.

## Next

This closes the bounded stale/last-valid design risk for one TextBlock. Before
product binding, measure scheduling with multiple dirty blocks and define the
frame budget plus priority policy for visible versus off-screen blocks.
