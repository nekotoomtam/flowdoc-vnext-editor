# Live Draft XR-2 One-Block Evidence

Status: bounded Node/Browser Worker parity accepted on 2026-07-20; performance
budgets are intentionally not defined yet.

## Outcome

The QA-only Worker path now injects the external Rustybuzz/ICU4X measurement
draft through Core's public `createVNextRendererBackedTextMeasurer(...)`
boundary, accepts the resulting measured lines, and runs bounded text-flow
pagination. The same input goes through the same Core adapter in Node-native
and real Chrome Worker execution.

Three deterministic workloads passed exact comparison:

| Scale | UTF-16 characters | Lines | Pages | Worker cold round-trip p50 | Worker warm round-trip p50 / p95 |
| --- | ---: | ---: | ---: | ---: | ---: |
| short Thai | 13 | 1 | 1 | 3.1 ms | 0.7 / 1.7 ms |
| medium mixed | 743 | 24 | 2 | 17.7 ms | 6.2 / 8.4 ms |
| long mixed | 4,959 | 120 | 9 | 62.0 ms | 17.3 / 22.9 ms |

These values describe one Windows/Chrome run and are retained as observations,
not release budgets. The Node-native cold p50 values include starting separate
Rustybuzz and ICU4X executables (43.13 ms, 151.06 ms, and 878.28 ms), so they
must not be read as browser typing latency.

Every retained row matched for normalized engine facts, line ranges and point
geometry, accepted-line summary, page geometry/count, work counters, fragment
fingerprints, measurement fingerprint, and final pagination fingerprint. Each
row used 5 cache-miss samples and 25 cache-hit samples in both runtimes. All
warm samples invoked the external engine provider zero times.

## Performance Findings From The Run

The first long-workload attempt exposed two accidental super-linear paths in
the external adapter:

1. candidate line widths repeatedly rescanned all glyphs and break offsets;
2. each UTF-8 glyph/break offset repeatedly rescanned the whole string to
   produce Core's UTF-16 offsets.

Both paths now build cumulative advance and byte-to-UTF-16 tables once, then
walk or look up offsets. A separate QA payload issue was also corrected: full
glyph/layout output is retained once per row, while repeated samples retain
only timing and cache facts.

## Files And Command

- Core facade: `src/core/coreAdapter.ts`
- Worker: `src/editor/liveDraft/liveDraftEngine.worker.ts`
- Workloads: `src/qa/liveDraftXr2Workloads.ts`
- Chrome evidence runner: `scripts/run-live-draft-xr2-evidence.mjs`
- Retained evidence:
  `src/fixtures/live-draft-xr2-one-block-performance-parity.v1.json`

Run with:

```sh
npm run evidence:live-draft-xr2
```

## Boundary And Next Slice

XR-2 does not bind Form state, render Canvas pages, call Backend per keystroke,
replace Core's default measurer, or claim whole-document/production
performance. XR-3 should bind one revision-pinned Form candidate to this
Worker path with debounce, cancellation/stale rejection, and preservation of
the last valid Draft result while an update runs.
