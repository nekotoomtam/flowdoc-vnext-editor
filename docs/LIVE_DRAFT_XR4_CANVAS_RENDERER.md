# Live Draft XR-4 Canvas Renderer

Status: bounded QA-only Canvas page renderer accepted on 2026-07-21;
whole-document and cross-runtime glyph-pixel parity remain out of scope.

## Outcome

The XR-3 latest-revision Form path now continues through a pure Core
text-flow display-list projection and a real browser Canvas 2D painter:

```text
memory-only Form candidate
  -> debounced Browser Worker
  -> injected measurement + Core line acceptance/pagination
  -> Core A4 page boxes and text-line paint commands
  -> pinned Sarabun FontFace
  -> responsive Canvas pages
```

Core owns page, body, line-break, line-box, baseline, style, paint order, and
display-list fingerprint facts. The Canvas painter does not call
`measureText`, choose breaks, or relayout lines. It scales locked point
coordinates into bounded device pixels and calls `fillText` only for paint.

Browser Canvas still owns glyph rasterization. XR-4 therefore proves stable
line/page consumption and visible pixels, not Canvas/PDF pixel identity or
glyph-position exactness across runtimes. The UI remains `draft-current`, not
Published or cross-runtime exact.

## Real Browser Observation

The retained Chrome run observed:

| Workload | Pages | Core paint commands | Worker | Canvas paint | End-to-end |
| --- | ---: | ---: | ---: | ---: | ---: |
| first short edit | 1 | 1 | 25.0 ms | 2.6 ms | 149.0 ms |
| warm short edit | 1 | 1 | 3.2 ms | retained separately | 81.0 ms |
| bounded multi-page | 4 | 44 | 18.8 ms | 4.9 ms | 100.0 ms |

End-to-end values include the intentional 75 ms debounce. The first edit also
includes cold initialization/JIT effects. These timings are observations from
one machine, not accepted performance budgets.

The first page contained 3,035 non-white pixels and retained a PNG SHA-256.
Every 4-page paint command produced one nonblank Canvas command. Desktop used
the stable 794 x 1123 intrinsic page size. At a 390 px mobile viewport the
same intrinsic pages scaled to 358 x 506.3 CSS pixels without horizontal
overflow or aspect-ratio drift.

During the next Form revision, the previous painted Canvas fingerprint stayed
visible until the new display list became current. Chrome observed zero
cross-origin and zero API/preview/PDF/render/export transport requests.

## Files And Command

- Core adapter binding: `src/core/coreAdapter.ts`
- Canvas font/painter: `src/editor/liveDraft/liveDraftCanvasFont.ts` and
  `src/editor/liveDraft/liveDraftCanvasPainter.ts`
- React page component: `src/components/preview/LiveDraftCanvasPage.tsx`
- QA route: `/__qa/live-draft-xr4-canvas`
- Retained evidence:
  `src/fixtures/live-draft-xr4-canvas-page-renderer.v1.json`

Run with:

```sh
npm run evidence:live-draft-xr4
```

## Boundary And Next Slice

XR-4 still covers one selected scalar and plain text-line commands only. It
does not paint styled runs, fields, images, tables, repeated headers, a whole
document, or Backend-authoritative output. It does not virtualize off-screen
pages or implement affected-range invalidation.

XR-5 should expand the Node/Browser comparison matrix before any broader
cross-runtime exactness language. XR-6 remains responsible for incremental
layout, virtualization, memory, long-task, and 200-page evidence.
