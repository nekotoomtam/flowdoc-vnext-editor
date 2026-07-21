# Live Draft MR1 Real Browser Worker Parity

Status: accepted for one bounded mixed-size TextBlock in a real Chrome Worker
on 2026-07-21. Editor product binding, display-list/Canvas paint, Backend
binding, whole-document layout, and production remain NO-GO.

## Outcome

Editor now has a separate QA-only MR1 page and Worker. They load the MR1 WASM
artifact plus hash-pinned Sarabun Regular/Bold bytes, resolve three effective
Text Runs, execute Rustybuzz and ICU4X inside the Worker, and return the Core
multi-run request and accepted positioned layout.

The same fixture runs through Node-native Rustybuzz/ICU4X. The runner compares
the complete Core request and complete Core layout as JSON plus every numeric
leaf. The retained result is:

```text
Core request exact: true
Core layout exact:  true
request drift:      0 layout units
layout drift:       0 layout units
request sha256:     b45979dc4b2fd0b1b5cb1c86ab6b01d235ca0b529a56aca0cdd7e25ee6b749af
layout sha256:      0c629528d10f414313114b9c29f2109b73c880510f5f34952cc2a39a6393137f
```

This closes the retained XR-5 blocker for a font-face switch inside one shaped
line only for this bounded Sarabun fixture. It does not close the full XR-5
release matrix.

## Bounded Fixture

The TextBlock resolves to `ABC`:

- `A`: Text, Sarabun Regular, 10 pt;
- `B`: Text, Sarabun Bold, 24 pt; and
- `C`: resolved field `customer.initial`, Sarabun Regular, 12 pt.

The Worker/Core result contains three shaping runs, three clusters, one line,
and three positioned fragments. Fragment faces are exactly Regular, Bold,
Regular. The resolved-field source segment remains attached to `C`.

Actual Sarabun font metrics produce:

```text
line width       27,524,000 layout units
natural ascent   25,632,000 layout units
natural descent   5,568,000 layout units
natural height   31,200,000 layout units
baseline offset  25,632,000 layout units
```

## Runtime Identity

The Worker verifies before execution:

- MR1 WASM SHA-256
  `cc130a7f8cef2694f8518cecb93b518eac2496fa8f4141f62ca284e6f34b0857`;
- boundary `flowdoc-text-engine-wasm-live-draft-mr1-v1`;
- Sarabun Regular SHA-256
  `b8150084e25734e6f31696c57ff009f5564efa09d295848b717d9e2328c0311d`;
  and
- Sarabun Bold SHA-256
  `5d1fc1ee63ab861fb2022a212b5ff270848582bb9d9cba73b2d2aaabb16d0a18`.

The historical XR Worker and artifact are unchanged. MR1 uses a separate HTML
page, Worker module, artifact URL, and evidence runner.

## Timing

Timing is observational on one Windows x64 machine running Node 24.15.0 and
Chrome 150. No numeric budget is accepted.

The retained run observed:

- asset fetch: 20.5 ms;
- complete first Worker round trip: about 367.7 ms;
- WASM/font runtime initialization inside the Worker: about 6.8 ms;
- first mixed-run layout: about 31.8 ms; and
- 25 subsequent complete mixed-run layouts: p50 about 1.9 ms and p95 about
  3.4 ms, with all results exactly identical.

The first round trip includes page/Worker module startup and must not be
treated as per-keystroke layout cost. The warm samples are closer to the
steady-state typing path, but one tiny fixture is not a product budget or
large-document result.

## Boundaries

- The QA Worker imports `@flowdoc/text-engine-rust-wasm/worker-mr1`, not Core.
- Existing Core use in Editor remains behind `src/core/coreAdapter.ts`.
- The run observed zero Backend-like requests.
- It does not modify the current Form controller, current XR Worker, Canvas,
  default measurer, pagination path, or Published/API flow.
- It does not paint text and therefore does not establish Canvas/PDF glyph or
  pixel parity.
- RTL/Bidi, inline images, decorations, tables, repeated headers, and
  whole-document composition remain blocked or out of scope.

## Evidence

- `src/fixtures/live-draft-mr1-real-browser-worker-parity.v1.json`;
- `src/qa/liveDraftMr1Evidence.worker.ts`;
- `src/qa/liveDraftMr1EvidencePage.ts`;
- `scripts/run-live-draft-mr1-evidence.mjs`; and
- `src/tests/liveDraftMr1Evidence.test.ts`.

Regenerate with `npm run evidence:live-draft-mr1`.

## Next

Project the accepted Core positioned fragments into a versioned per-fragment
display list, then let a QA Canvas painter consume only those positions and
styles without calling `measureText` or relaying out the line.
