# Live Draft MR1 Multi-Line Multi-Glyph Canvas Evidence

Status: accepted for one bounded mixed-style TextBlock in a separate real
Chrome QA path on 2026-07-21. Product binding, Backend binding,
whole-document composition, general glyph/pixel parity, and production remain
NO-GO.

## Outcome

The longer fixture exercises a realistic sequence instead of one glyph per
fragment: English and Thai text, Sarabun Regular/Bold, 10/12/24 pt runs, a
resolved field, five wrapped lines, and one shaping run split across lines.

```text
same multi-run request
  -> Node-native Rustybuzz/ICU4X layout
  -> real Chrome Worker WASM Rustybuzz/ICU4X layout
  -> Core fragment display list
  -> real Chrome Canvas paint
```

Node and Chrome produced exactly equal request, accepted layout, and Core
display-list objects. Maximum integer drift was zero at all three boundaries.
All 25 warm Worker layout, Core projection, and Canvas paint samples produced
the same retained facts.

## Exact Facts

```text
rendered text length:          74 UTF-16 units
shaping runs:                  4
clusters:                      65
lines:                         5
display-list commands:         8
multi-glyph commands:          8 of 8
layout maximum drift:          0 layout units
display-list maximum drift:    0 layout units
layout fingerprint:            sha256:101ceac4a314adb150aa57ad5f9d9153e1f2a746205a4549efb9e54cd411a3c7
display-list fingerprint:      sha256:4884b5122ed20efd46749f4d70a731ba1347e8976ce710eb8c85c53096b60876
```

The commands cover line indexes `0..4` at increasing accepted baselines. They
retain both font faces, weights 400/700, sizes 10/12/24 pt, and resolved-field
key `customer.displayName`. At least one original shaping run is deliberately
split into commands on more than one line.

## Canvas And Timing Observation

Chrome painted 10,094 non-white pixels on the 794 x 1,123 intrinsic Canvas.
The retained PNG data digest is
`3a456a4265e180d1b51fc0eac682dadcea416304f72c04386d2bf86be741cd7a`.

One Windows x64 run under Chrome 150 observed these initialized distributions:

| Stage | Samples | p50 | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Worker layout | 25 | 5.9 ms | 8.9 ms | 12.6 ms |
| Core projection | 25 | 2.7 ms | 5.5 ms | 8 ms |
| Canvas paint | 25 | 0 ms | 0.1 ms | 0.2 ms |

These values are observations from one bounded fixture and environment, not
accepted budgets. They do not yet include React reconciliation, input-event
handling, scheduling, multiple dirty blocks, or document pagination.

## Boundaries

- The QA page reaches Core only through `src/core/coreAdapter.ts`.
- The Canvas painter measures no text and performs no wrapping or relayout.
- Chrome observed zero Backend-like requests.
- The exact fixed-point display list proves placement parity, while the pixel
  check proves that commands were painted. It does not prove Canvas glyph
  outlines or pixels equal a PDF renderer.
- Existing product controller, product Canvas, Backend/API, default measurer,
  pagination, and published output paths are unchanged.

## Evidence

- `src/fixtures/live-draft-mr1-multiline-multi-glyph-canvas.v1.json`;
- `src/qa/liveDraftMr1MultiLineFixture.ts`;
- `src/qa/liveDraftMr1MultiLineEvidencePage.ts`;
- `qa/live-draft-mr1-multiline-evidence.html`;
- `scripts/run-live-draft-mr1-evidence.mjs`; and
- `src/tests/liveDraftMr1MultiLineEvidence.test.ts`.

Regenerate the retained MR1 evidence with `npm run evidence:live-draft-mr1`.

## Next

The rapid consecutive revision gate is now accepted in
`LIVE_DRAFT_MR1_RAPID_EDIT_LIFECYCLE.md`: stale completion cannot publish and
the Canvas retains last-valid while pending or blocked. Keep the path QA-only
while multi-block scheduling and a frame budget are designed.
