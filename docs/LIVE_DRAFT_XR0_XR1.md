# Live Draft XR-0 / XR-1

Status: bounded runtime smoke accepted on 2026-07-20.

## Outcome

Editor still renders the honest `Exact preview not generated` placeholder and
`layout.live` still has placeholder job behavior. Form typing is not connected
to a worker and does not produce page output.

The new QA path proves a narrower prerequisite:

1. Chrome starts a dedicated Browser Worker.
2. The main thread transfers pinned WASM and Sarabun font bytes.
3. The Worker verifies both SHA-256 identities before measurement.
4. Rustybuzz 0.20.1 shapes the row in WASM.
5. ICU4X Segmenter 2.2.0 finds line-break candidates in WASM.
6. The runner compares normalized Worker results with Node-native Rustybuzz
   and ICU4X results.

The two retained rows are:

- Thai: `สวัสดีครับตูม` (`thai-greeting-no-space`);
- Latin: `Prepared summary` (`product-report-vnext-minimal`).

Both rows match exactly for the bounded smoke facts: glyph ids, clusters,
advances, offsets, UTF-8 break offsets, and UTF-16 break offsets.

The historical accepted manifest and its measurement-profile pointer are
retained as row-selection provenance. Execution uses a separate QA profile
whose identity names the concrete Rustybuzz 0.20.1 and ICU4X 2.2.0 revisions;
the older profile's `planned` ingredients are not reported as executed facts.

## Files

- Worker protocol and stale identity comparison:
  `src/editor/liveDraft/liveDraftWorkerProtocol.ts`
- Dedicated engine Worker: `src/editor/liveDraft/liveDraftEngine.worker.ts`
- Real Chrome runner: `scripts/run-live-draft-worker-smoke.mjs`
- Retained evidence:
  `src/fixtures/live-draft-xr1-browser-worker-smoke.v1.json`

Run the real Browser Worker evidence gate with:

```sh
npm run test:live-draft-worker-smoke
```

## Boundary

This slice does not bind Form state, does not call Backend per keystroke, does
not create Canvas pages, does not replace Core's default measurer, and does not
claim general cross-runtime exactness. `published-exact` remains Backend-owned.

XR-2 is now recorded separately in
`docs/LIVE_DRAFT_XR2_ONE_BLOCK_EVIDENCE.md`. It injects the measurer into the
public Core boundary for three bounded one-block workloads while keeping Form
and production binding out of scope.
