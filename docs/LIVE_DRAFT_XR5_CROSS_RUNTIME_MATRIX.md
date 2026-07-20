# Live Draft XR-5 Cross-Runtime Matrix

Status: partial release-gating matrix checkpoint accepted on 2026-07-21;
explicit blockers remain and general cross-runtime exactness is not claimed.

## Outcome

The XR-2 Node/real-Chrome-Worker harness now covers the XR-4 Core display-list
projection as well as normalized engine and pagination facts:

```text
same canonical QA row
  -> Node-native Rustybuzz + ICU4X
  -> Browser Worker WASM Rustybuzz + ICU4X
  -> injected Core measurement and acceptance
  -> Core text-flow pagination
  -> Core display-list projection
  -> normalized, geometry, command, source, and fingerprint comparison
```

Both runtimes pin the same Live Draft measurement profile, executable WASM
digest, Sarabun Regular digest, and Sarabun Bold digest. Cache-miss and
cache-hit samples are retained for every row. Warm samples invoke the engine
provider zero times.

## Accepted Bounded Rows

| Coverage | Scenario | Font/style | Lines | Pages | Commands |
| --- | --- | --- | ---: | ---: | ---: |
| mixed Thai/Latin | `mixed-report-title` | Sarabun Bold / `heading-xl` | 2 | 1 | 2 |
| mixed Thai/Latin | `mixed-product-name` | Sarabun Regular / `paragraph` | 2 | 1 | 2 |
| style-to-font map | `shape-thai-greeting-sarabun-regular` | Sarabun Regular | 1 | 1 | 1 |
| style-to-font map | `shape-mixed-heading-sarabun-bold` | Sarabun Bold | 2 | 1 | 2 |
| field adjacency | `rich-inline-field-chip-adjacency` | Sarabun Regular | 2 | 1 | 2 |
| width pair | `line-wrap-narrow-24pt` | Sarabun Regular | 5 | 1 | 5 |
| width pair | `line-wrap-wide-10000pt` | Sarabun Regular | 1 | 1 | 1 |
| forced break | `forced-line-break-planned` | Sarabun Regular | 3 | 1 | 3 |
| long block | `large-document-long-body-block` | Sarabun Regular | 120 | 9 | 120 |

The narrow and wide rows use identical text, font, profile, and normalized
engine facts. Only available width differs; the retained normalized-result
hash is the same while line count changes from five to one.

The field row retains four clipped source segments across two lines, including
the exact `resolved-field` segment and `customer.name` key. The forced-break
row retains two `hard-break` source segments and now produces exactly three
lines. This run exposed and fixed an adapter bug where a newline opportunity
could previously be treated as optional when following text still fit.

## Drift Policy And Result

The QA cross-runtime policy requires:

- exact break offsets, line/page counts, source segments, and fingerprints;
- zero drift for normalized engine numeric facts;
- at most `0.000001 pt` drift for Core and display-list geometry; and
- fail-closed status for any mismatch.

The retained run observed zero maximum drift in all three numeric groups and
exact normalized, Core, display-list, and fingerprint comparisons for all nine
rows.

Observed Browser Worker round trips remain informational. The short/medium
rows were roughly 1.4-23.6 ms cold and 0.7-3.4 ms warm. The 4,959-character
long row was 76.1 ms cold and 23.1 ms warm. No release performance budget is
defined by this evidence.

## Retained Blockers

Five blocked rows are stored beside the accepted rows:

- one line switching font faces across inline runs;
- constrained Table cell composition;
- repeated Table headers;
- explicit page-break nodes in the one-block text-flow path; and
- default/approximate-versus-renderer drift evaluation.

The first two style-to-font rows prove stable mapping across separate accepted
rows. They do not prove mixed-font shaping inside one line. The Node/Browser
renderer-backed zero-drift result also must not be relabeled as the distinct
default/approximate-versus-renderer drift fixture.

## Files And Command

- Matrix rows and blockers: `src/qa/liveDraftXr5Matrix.ts`
- Browser harness: `src/qa/liveDraftXr5EvidencePage.ts`
- Node/Chrome evidence runner: `scripts/run-live-draft-xr5-evidence.mjs`
- Retained evidence:
  `src/fixtures/live-draft-xr5-cross-runtime-matrix.v1.json`

Run with:

```sh
npm run evidence:live-draft-xr5
```

## Boundary And Next Work

The full v1 release-gating matrix remains `partial-not-accepted`. XR-5 must
continue through real Table cell/repeated-header ownership and the distinct
approximate-versus-renderer drift fixture before a full-matrix claim. Mixed
font faces inside one inline line require an accepted per-run shaping and
paint-geometry contract.

Default `measureVNextText(...)` replacement, production activation,
whole-document exactness, Backend admission, and glyph-pixel parity remain out
of scope. XR-6 still owns incremental invalidation, virtualization, memory,
long-task, and 200-page evidence.
