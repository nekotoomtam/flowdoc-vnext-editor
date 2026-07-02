# Phase 5.6 Core Semantic Bridge

Status: implemented
Date: 2026-07-02
Branch: `codex/core-semantic-bridge`
Scope: adapter-safe core node semantics for the product editor runtime

## Summary

Phase 5.6 carries core graph semantics through the editor adapter seed instead
of making the editor infer everything from raw node `type` strings.

The runtime remains flat and render-friendly. The added fields are semantic
facts from the core runtime graph, not a new canonical document model.

## Semantic Fields Added

`CoreEditorNodeSummary` can now carry:

```txt
textRole
headingLevel
operationSurface
nearest
capabilities
```

The `nearest` field mirrors core relationship graph context:

```txt
sectionId
zoneId
blockId
textBlockId
columnsId
columnId
tableId
tableRowId
tableCellId
```

The `capabilities` field carries editor-safe capability booleans:

```txt
childrenField
canContainText
canSplitAcrossPages
canBeDeleted
canBeDuplicated
canBeReordered
```

## Behavior Changed

- Core runtime seed mapping now reads `nearestByNodeId` and
  `capabilitiesByType` when present.
- Text-block role is mapped from canonical core text-block `role`.
- Heading text blocks render as `heading` from `textRole`, not only from legacy
  placeholder node type names.
- Presentation nodes carry nearest context, operation surface, text role, and
  capabilities for future command policy work.
- Inspector facts show role, operation surface, delete capability, and reorder
  capability.
- Command capability mirror uses core capability booleans when available while
  preserving old placeholder fallback behavior.

## Evidence

- `src/core/coreTypes.ts`
- `src/core/coreRuntimeSeedMapper.ts`
- `src/editor/presentation/nodePresentationTypes.ts`
- `src/editor/presentation/nodePresentationProjector.ts`
- `src/editor/render/renderProjector.ts`
- `src/editor/coreBinding/capabilityMirror.ts`
- `src/tests/coreReadBinding.test.ts`
- `src/tests/workingSetFactory.test.ts`
- `src/tests/nodePresentation.test.ts`

## Core Fixture Contract

For `product-report-vnext-minimal`:

- `title` is a `text-block` with `textRole: heading`, `headingLevel: 1`, and
  `operationSurface: text-block`.
- `detail-cell-b-text` carries table nearest context including
  `tableId: detail-table`, `tableRowId: detail-header-row`, and
  `tableCellId: detail-cell-b`.
- `detail-cell-b-text` has `textRole: label`, which is preserved instead of
  being normalized to paragraph.
- `detail-table` command capabilities are not text-editable, but are deletable
  and reorderable from core capabilities.

## Checks Run

- `npx vitest run src/tests/coreReadBinding.test.ts src/tests/workingSetFactory.test.ts src/tests/nodePresentation.test.ts`
- `npm run check`

Latest full check result:

- type-check: PASS
- Vitest: PASS, 20 files / 92 tests
- build: PASS

## Browser QA Evidence

2026-07-02 in-app browser QA against `http://127.0.0.1:4001/`:

- Dev server returned 200.
- Canvas block ids remained `title`, `summary-columns`, and `detail-table`.
- `title` rendered as `paper-block--heading` with meta label `Heading`.
- The inspector for `title` showed `Role heading`, `Surface text-block`,
  `Delete yes`, and `Reorder yes`.
- Clicking `detail-table` selected `detail-table` in canvas, outline, status,
  and overlay; inspector showed `Surface table`, `Delete yes`, and
  `Reorder yes`.
- Clicking `summary-columns` selected `summary-columns` in canvas, outline,
  status, and overlay; inspector showed `Surface columns`, `Delete yes`, and
  `Reorder yes`.

## Risks Left

- Core semantic fields are still optional because placeholder seed fallback
  data does not carry them.
- Product presentation still collapses table/cell internals to the owning table
  surface.
- Command policy is not fully redesigned yet; the capability mirror only
  consumes safe booleans as preparation.
- `divider` and `spacer` remain core-supported but unopened as product-facing
  UI surfaces.

## Intentionally Not Changed

- No core schema changes.
- No WYSIWYG.
- No contenteditable.
- No table/cell editing.
- No mutation bridge.
- No real pagination.
- No backend/API transport.
