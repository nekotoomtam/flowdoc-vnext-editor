# Live Draft MR1 Intra-TextBlock Incremental Reflow Analysis

Status: accepted for a bounded real-Chrome Worker, full-layout-oracle QA slice
on 2026-07-21. This is not a product Editor binding or incremental executor.

## What this slice proves

The QA path runs one 4,959 UTF-16-unit TextBlock through the separately pinned
MR1 Rustybuzz/ICU4X WASM Worker. Its five source runs include normal text, an
18 pt Bold span inside a 12 pt paragraph, a resolved field, and normal suffix
text. External itemization produces three effective shaping runs, 4,319
clusters, 1,121 break opportunities, and 124 Core-accepted lines.

Every edited layout is executed ten times as a complete oracle and produces an
identical deterministic result. The Core-side analysis then checks an affected
line window against the baseline:

| Edit | Result | Reflowed next lines | Reflowed UTF-16 units |
|---|---|---:|---:|
| near start | window proved | 2 | 86 |
| near middle | window proved | 2 | 82 |
| line edge | window proved | 2 | 82 |
| page edge | window proved | 3 | 125 |
| style boundary | window proved | 10 | 280 |
| resolved-field boundary | window proved | 3 | 125 |
| near end | full fallback | n/a | n/a |
| hard-break insertion | full fallback | n/a | n/a |
| oversized insertion | full fallback | n/a | n/a |

The end edit falls back because fewer than two stable suffix lines remain. The
contract does not relax its reconvergence rule merely because the edit is near
the end. All six proved windows match full-oracle integer geometry exactly.

## Timing facts

The retained Chrome run records 90 complete layouts:

| Work | p50 | p95 |
|---|---:|---:|
| complete long-block MR1 layout | 192.7 ms | 323.9 ms |
| input/style resolution | 0.3 ms | 0.6 ms |
| Rustybuzz shaping | 17.3 ms | 34.0 ms |
| ICU4X segmentation/normalization | 43.8 ms | 82.8 ms |
| line breaking | 12.3 ms | 27.7 ms |
| Core acceptance/fingerprinting | 90.2 ms | 163.0 ms |
| adapter fingerprinting | 23.3 ms | 49.8 ms |
| Editor token-impact advisory | 1.4 ms | 3.3 ms |
| QA-only whole-suffix oracle analysis | 27.4 ms | 42.5 ms |

These are observational diagnostics from one machine. No product frame budget
is claimed. The Worker round trip covers the whole 90-sample matrix and is not
a per-keystroke value.

The older XR5 23.1 ms warm row used retained measurement-provider facts. This
fixture deliberately repeats shaping, segmentation, Core acceptance, and both
fingerprint layers, which is why its timings are not comparable to that cache
hit.

## Runtime boundary

The Worker runtime now exposes `profileLayout` beside `layout`. Both execute
the same deterministic layout function. The profile holds timing separately,
marks it diagnostic-only, and proves that timing cannot change fingerprints.

The checkpoint analysis is also separate from publication. It declares:

- `execution: full-layout-oracle-analysis-only`;
- `fullLayoutOracleRequired: true`;
- `mayPublishLayout: false`;
- `partialShapingExecuted: false`; and
- no renderer, Backend, product, Table, or production binding.

The Editor lexical token range remains a scheduling hint only. It does not own
line breaks or geometry.

## Next implementation gate

The next slice should add versioned Rust/WASM range-shaping facts with explicit
pre/post context, bounded ICU4X segmentation context, retained cluster and
line-checkpoint fingerprints, an affected-window line builder, and incremental
Core acceptance. Every assembled result must continue to match the complete
oracle in QA, while runtime publication must use the incremental contract or
fall back without running both paths.

Product React input, IME/caret/selection, default Worker/controller binding,
Backend/API, tables, columns, images, repeated headers, auto-fit column width,
Canvas page virtualization, and production remain outside this gate.

## Evidence

- `src/qa/liveDraftMr1IncrementalReflowFixture.ts`
- `src/qa/liveDraftMr1IncrementalReflowEvidence.worker.ts`
- `src/qa/liveDraftMr1IncrementalReflowEvidencePage.ts`
- `scripts/run-live-draft-mr1-incremental-reflow-evidence.mjs`
- `src/fixtures/live-draft-mr1-incremental-reflow-analysis.v1.json`
- `src/tests/liveDraftMr1IncrementalReflowEvidence.test.ts`
- `../flowdoc-vnext-core/docs/LIVE_DRAFT_MR1_INCREMENTAL_REFLOW_ANALYSIS.md`
