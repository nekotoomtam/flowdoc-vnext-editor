# Live Draft MR1 Contextual Range Facts

Status: accepted for a bounded real-Chrome Worker QA slice on 2026-07-21.
Contextual range shaping and bounded range segmentation are executable; an
affected-window line builder, incremental Core acceptance, product binding,
and production remain NO-GO.

## What is now executable

The separate MR1-range WASM artifact shapes a selected part of one effective
Text Run while retaining explicit pre/post context. The engine derives
direction, script, and language properties from the complete effective-run
text, then applies those properties to the selected range. Returned clusters
remain global UTF-8 offsets and normalize to safe global UTF-16 offsets. Each
range glyph also carries Rustybuzz's `unsafeToBreak` fact.

The ICU4X path segments a bounded context around a target range. Context grows
32 -> 64 -> 128 UTF-16 units and needs two equal consecutive expansions before
it reports `bounded-stable`. Artificial breaks introduced only because a
context substring starts or ends are excluded. Reaching the context limit or
requiring the complete text returns `fallback-required`.

Stability alone does not publish layout. The bounded result says
`oracleVerified: false` and `mayPublishLayout: false`. QA separately compares
the selected breaks with a complete ICU4X oracle. Likewise, range shaping may
be used only after its range boundaries and every integer glyph fact match the
complete effective-run oracle, or the caller must fall back.

## Real Chrome evidence

The QA Worker loads the digest-pinned MR1-range WASM artifact plus pinned
Sarabun Regular and Bold bytes. Six 30-unit ranges are distributed across a
4,959-unit Thai/Latin block from near the start through near the end. All six
range-shaping results match the full oracle exactly for glyph id, global
cluster, advances, and offsets. All six bounded segmentation results stabilize
in three context attempts and match the complete ICU4X oracle exactly. Chrome
makes zero Backend-like requests.

Observed diagnostic timings on this machine were:

| Work | p50 | p95 |
|---|---:|---:|
| complete effective-run shaping | 9.7 ms | 14.8 ms |
| contextual 30-unit range shaping | 1.9 ms | 3.3 ms |
| complete TextBlock segmentation | 26.8 ms | 36.0 ms |
| bounded segmentation with stability checks | 7.7 ms | 10.7 ms |

The shaped range is about 0.605% of the full fixture. Timing is diagnostic and
does not establish a product frame budget. The Worker round trip includes the
complete evidence matrix and is not a per-keystroke value.

## Scope boundary and next gate

This slice proves engine facts only. It does not publish layout, splice glyphs
into retained runs, rebuild affected lines, perform incremental Core
acceptance, update compositional fingerprints, or bind React input,
IME/caret/selection, Backend/API, tables, columns, images, repeated headers, or
auto-fit column width.

The next slice should retain prefix/suffix cluster facts, add an
affected-window line builder, rebuild only the invalidated lines, and introduce
a dedicated incremental Core acceptance/fingerprint boundary. QA must continue
to compare the assembled result to a complete oracle, while runtime must choose
either the bounded path or a full fallback instead of executing both.

## Evidence

- `src/qa/liveDraftMr1RangeEvidence.worker.ts`
- `src/qa/liveDraftMr1RangeEvidencePage.ts`
- `qa/live-draft-mr1-range-evidence.html`
- `scripts/run-live-draft-mr1-range-evidence.mjs`
- `src/fixtures/live-draft-mr1-contextual-range-facts.v1.json`
- `src/tests/liveDraftMr1RangeEvidence.test.ts`
- `../flowdoc-vnext-core/docs/LIVE_DRAFT_MR1_CONTEXTUAL_RANGE_FACTS.md`
