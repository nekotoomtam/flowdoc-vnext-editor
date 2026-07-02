# Phase 5.5 Node Presentation Projection

Status: implemented
Date: 2026-07-02
Branch: `codex/product-node-projection`
Scope: product-facing node projection for canvas, outline, inspector, and selection targets

## Summary

Phase 5.5 adds a product-facing presentation projection between the normalized
editor runtime graph and visible UI surfaces.

The projection keeps the runtime model flat for fast lookup and rendering, but
prevents raw structural graph nodes from becoming normal product blocks.

This is not a new canonical document model. Core package data remains the
source of truth.

## User-Facing Surface Types

The current product surface exposes only:

```txt
text-block
columns
table
toc
page-break
```

The following nodes remain internal/contextual in the product UI:

```txt
document
section
zone
column
table-row
table-cell
```

Core-supported utility nodes such as `divider` and `spacer` remain future UI
surfaces and are not opened in this slice.

## Behavior Changed

- `EditorView` now owns `presentation`, derived from `nodeById`,
  `childrenById`, and `nodeOrder`.
- `renderableNodeIds` now means product-facing canvas surface ids, not every
  non-section/non-zone graph node.
- Render projection reads `view.presentation.canvasSurfaceNodeIds`.
- Outline items come from the same presentation projection as canvas surfaces.
- Selection commands resolve internal node ids to the owning presentation
  surface before updating selection state.
- Selection command history records the resolved product surface id.
- Inspector facts resolve through the same selection target boundary.
- Render kind now recognizes `columns`, `toc`, and `page-break` as product
  render vocabulary instead of collapsing them to `generic`.

## Core Fixture Contract

For the public core fixture `product-report-vnext-minimal`:

```txt
canvas surfaces:
  title
  summary-columns
  detail-table

internal represented nodes:
  summary-left -> summary-columns
  summary-left-text -> summary-columns
  detail-header-row -> detail-table
  detail-cell-a -> detail-table
  detail-cell-a-text -> detail-table
  detail-cell-b -> detail-table
  detail-cell-b-text -> detail-table
```

This matches the current product vocabulary while preserving the underlying
core graph for future deeper table/cell editing.

## Evidence

- `src/editor/presentation/nodePresentationProjector.ts`
- `src/editor/presentation/nodePresentationTypes.ts`
- `src/editor/runtime/editorView.ts`
- `src/editor/render/renderProjector.ts`
- `src/editor/runtime/editorState.ts`
- `src/editor/commands/commandExecutor.ts`
- `src/tests/nodePresentation.test.ts`

## Checks Run

- `npm run check`

Latest full check result:

- type-check: PASS
- Vitest: PASS, 20 files / 92 tests
- build: PASS

## Browser QA Evidence

2026-07-02 in-app browser QA against `http://127.0.0.1:4001/`:

- Dev server returned 200.
- Canvas block ids were `title`, `summary-columns`, and `detail-table`.
- Outline ids matched the same three product-facing surfaces.
- Outline types were `text-block`, `columns`, and `table`.
- Clicking `detail-table` selected `detail-table` in canvas, outline,
  inspector, status, and overlay.
- Clicking `summary-columns` selected `summary-columns` in canvas, outline,
  inspector, status, and overlay.
- `.canvas-overlay-layer` still computed `pointer-events: none`.

## Risks Left

- Core adapter still does not pass `nearest`, `operationSurface`, capabilities,
  or text-block role into the editor seed.
- Text blocks from canonical core currently render as paragraph-like blocks
  because the editor seed does not yet carry text role.
- Deeper table/cell selection is intentionally collapsed to the owning table
  surface until command policy and editing targets are designed.
- `divider` and `spacer` remain core-supported but unopened in the current
  product presentation vocabulary.
- Preview pagination is still placeholder grouping, not core layout truth.

## Intentionally Not Changed

- No core schema changes.
- No WYSIWYG.
- No contenteditable.
- No cell editing.
- No text caret.
- No real pagination.
- No mutation bridge.
- No backend/API transport.
