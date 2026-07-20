# Live Draft XR-3 Form Binding

Status: bounded QA-only Form binding accepted on 2026-07-20; Canvas and
whole-document Live Draft remain out of scope.

## Outcome

One selected memory-only Form scalar (`documentTitle`) now follows this local
path:

```text
Form state + canonical candidate
  -> revision/fingerprint projection
  -> 75 ms latest-value debounce
  -> Browser Worker
  -> injected renderer-backed text measurer
  -> Core measured-line acceptance and bounded pagination
  -> retained Core line result in the QA Preview surface
```

Typing does not call Backend admission, Draft/Published generation, or PDF
transport. The existing exact-PDF preview lifecycle and the older
`layout.live` job placeholder remain separate and unchanged.

The controller retains the previous valid Core result while a newer revision
is scheduled or running. A result is applied only when its request id,
revision, Draft snapshot fingerprint, and canonical Form candidate fingerprint
still match the latest projection. Obsolete in-flight work is cancelled when
possible and late results are ignored.

## Real Browser Observation

The retained Chrome run dispatched 15 separate Form input revisions within
one debounce window. They produced 15 schedules but one Worker/Core request.
The second eight-edit burst preserved the first valid page while updating and
then applied revision 23, the latest revision.

The first result took 128.9 ms end-to-end, including the first WASM/font load.
The following warm result took 79.0 ms end-to-end; its Worker work was 1.9 ms.
These are one-machine observations, not accepted performance budgets.

Chrome recorded 310 same-origin development requests for the page and its
modules/assets, zero cross-origin requests, and zero API/preview/PDF/render/
export transport requests. The rendered line source was Core's accepted line
boxes rather than browser text measurement.

Deterministic controller tests separately force a late obsolete result and
verify that it is counted as stale, cannot replace the latest revision, and
does not remove the previous valid result while the next request is pending.

## Files And Command

- Form projection: `src/editor/liveDraft/liveDraftFormProjection.ts`
- Debounce/latest-revision controller:
  `src/editor/liveDraft/liveDraftFormController.ts`
- Browser client and Worker:
  `src/editor/liveDraft/liveDraftBrowserClient.ts` and
  `src/editor/liveDraft/liveDraftEngine.worker.ts`
- React binding and QA route: `src/app/useLiveDraftFormPreview.ts` and
  `/__qa/live-draft-xr3-form`
- Retained evidence:
  `src/fixtures/live-draft-xr3-form-binding.v1.json`

Run with:

```sh
npm run evidence:live-draft-xr3
```

## Boundary And Next Slice

XR-3 proves one selected scalar and one bounded text block only. It does not
resolve a whole document, paint Canvas, execute JSON mapping, admit Backend
content, replace Core's default measurer, or claim Published/API equivalence.

XR-4 should consume shared display-list/page output in a Canvas renderer while
preserving this latest-revision controller and the explicit distinction
between `draft-current` and Backend-authoritative Published output.
