# Live Draft MR1 Multi-Run Canvas Paint

Status: accepted for one bounded mixed-size TextBlock in a separate real Chrome
QA Canvas path on 2026-07-21. Editor product binding, Backend binding,
whole-document composition, general glyph/pixel parity, and production remain
NO-GO.

## Outcome

The QA page loads the same digest-pinned Sarabun Regular/Bold bytes used by the
MR1 Worker. The Worker returns the accepted Core mixed-run layout. Editor calls
the Core per-fragment projector only through `src/core/coreAdapter.ts`, then a
separate painter consumes those commands.

```text
real Chrome Worker accepted layout
  -> Core per-fragment display list
  -> one Canvas fill per accepted fragment
  -> nonblank pixel and PNG evidence
```

The painter divides fixed-point layout units once at the paint boundary, sets
font face/weight/size/color per command, and paints at the accepted baseline.
It does not measure text, wrap, recalculate advances, choose line breaks, or
recompute line height/baseline.

## Exact Facts

The complete display-list object is exactly equal under Node-native layout and
real Chrome Worker layout:

```text
layout exact:                 true
display list exact:           true
layout maximum drift:         0 layout units
display-list maximum drift:   0 layout units
layout sha256:                0c629528d10f414313114b9c29f2109b73c880510f5f34952cc2a39a6393137f
display-list sha256:          d68bfa9e00ba1cbd608682febb9a9c1b0447868bcc1ae4f6728b83f83876fab5
```

The three commands retain:

| Text | Face | Size | Weight | Baseline X | Baseline Y |
| --- | --- | ---: | ---: | ---: | ---: |
| `A` | Sarabun Regular | 10 pt | 400 | 72 pt | 97.632 pt |
| `B` | Sarabun Bold | 24 pt | 700 | 77.96 pt | 97.632 pt |
| `C` | Sarabun Regular | 12 pt | 400 | 92.504 pt | 97.632 pt |

The `C` command retains resolved-field key `customer.initial`. Both font faces
reported ready before paint.

## Pixel Evidence

Chrome painted a 794 x 1,123 intrinsic A4 Canvas at device-pixel ratio 1. The
result contained 2,589 non-white pixels. The retained PNG data digest is
`b765e0fa3e4b8bdc21fbdf6f114d99bf051e38214810e83a95e0a36f6f100882`.

This proves that all three accepted fragment commands reached a real Canvas
with the intended face/size/weight changes. It does not prove that Canvas glyph
outlines, kerning, or pixels equal a PDF renderer. Canvas still owns glyph
rasterization inside each fragment.

## Timing

One Windows x64 run under Chrome 150 observed:

- asset fetch: about 49.2 ms;
- both Canvas font faces ready: about 39.9 ms;
- first Worker round trip: about 491 ms;
- Core display-list projection: about 13.5 ms; and
- Canvas paint: about 7.5 ms.

These are cold observational values for a tiny fixture, not accepted budgets.
The Worker round trip includes Worker/module startup. The retained earlier
initialized Worker evidence remains the better typing-path observation.

## Boundaries

- The QA page reaches Core only through `src/core/coreAdapter.ts`.
- The Worker still imports the external text-engine package, not Core.
- The painter contains no browser text-measurement or relayout path.
- Chrome observed zero Backend-like requests.
- Existing product Worker/controller, current XR Canvas painter, Form lifecycle,
  pagination, default measurer, and Published/API paths are unchanged.
- RTL/Bidi, multi-glyph outline reconciliation, underline/strikethrough, inline
  images, tables, repeated headers, pagination, and whole-document composition
  remain blocked or outside this slice.

## Evidence

- `src/fixtures/live-draft-mr1-multi-run-canvas-paint.v1.json`;
- `src/qa/liveDraftMr1CanvasEvidencePage.ts`;
- `src/editor/liveDraft/liveDraftMultiRunCanvasPainter.ts`;
- `src/editor/liveDraft/liveDraftMultiRunCanvasFont.ts`;
- `scripts/run-live-draft-mr1-evidence.mjs`; and
- `src/tests/liveDraftMr1CanvasEvidence.test.ts`.

Regenerate both retained MR1 Worker and Canvas evidence with
`npm run evidence:live-draft-mr1`.

## Next

The multi-line/multi-glyph and rapid-edit/last-valid checkpoints are now
accepted in `LIVE_DRAFT_MR1_MULTILINE_MULTI_GLYPH.md` and
`LIVE_DRAFT_MR1_RAPID_EDIT_LIFECYCLE.md`. Keep product paths unchanged while
the next multi-block scheduling and frame-budget checkpoint is designed.
