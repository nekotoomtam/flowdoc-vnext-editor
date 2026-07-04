# Command UX Gate

Status: active
Date: 2026-07-04
Scope: FlowDoc vNext editor command controls before drag/drop UX

## Decision

The Inspector duplicate, delete, move up, and move down controls are an interim
command harness. They prove command policy, backend transport, revision gates,
runtime apply, stale recovery, and history records. They are not the final UX
for structural editing.

`docs/DRAG_DROP_REORDER_CONTRACT.md` is the active reorder UX contract for the
next implementation slice.

## Current Controls

- Duplicate stays available only for operation surfaces that policy marks
  duplicable.
- Delete requires explicit confirmation while undo is unavailable.
- Move up and move down stay available only as scaffold controls for reorder
  plumbing and recovery tests.
- Focused canvas blocks support `Control/Meta + ArrowUp/ArrowDown` as the
  adjacent keyboard fallback through backend reorder mutation. The keyboard
  fallback resolves adjacency from canvas surface order, not Inspector sibling
  button order.
- Reorder buttons must not be treated as UX pass evidence for the final editor.

## Drag/Drop Gate

Do not start drag/drop implementation until this gate is reviewed:

1. Drag/drop must dispatch editor command intent and continue through backend
   transport/revision gates before runtime apply.
2. Target eligibility must be visible before drop, including blocked targets and
   rejected hierarchy moves.
3. Table, cell, section, and zone hierarchy must not expose raw graph details as
   the primary user model.
4. Drop preview must show before/after placement without changing document
   state until the backend accepts the mutation.
5. Keyboard or non-pointer reorder fallback must exist before declaring
   adjacent reorder UX complete.
6. Stale, rejected, and failed mutation states must keep selection on a valid
   surviving node and show a recoverable status.
7. Manual QA must cover duplicate, delete confirmation, cancel delete,
   successful delete, stale delete, reorder success, reorder rejection, and
   selection recovery.

Use `src/editor/commands/reorderPlacement.ts` as the command-layer gate for
drop target readiness and preview order, and
`src/app/useCanvasReorderDrag.ts` for transient canvas drag state. Target
affordance state should stay machine-readable through data attributes such as
`data-reorder-target` and `data-reorder-reason`; do not expose raw graph
reasons as primary visible product copy. Keyboard fallback must derive adjacent
movement from canvas surface order before building backend `toIndex`; Inspector
scaffold buttons may remain structural sibling controls. Do not create a
separate pointer-only index path. Use `docs/REORDER_FAILURE_PATH_QA.md` before
adding browser failure-path fixtures or hooks.

## Interim QA Checklist

Run this while the Inspector harness remains visible:

1. Select a deletable node and click Delete once; confirm no mutation is sent.
2. Click the cancel icon; confirm the selected node and action availability stay
   unchanged.
3. Click Delete then Confirm; confirm the backend accepts the delete and
   selection recovers to a valid node.
4. Select a different node while confirmation is active; confirm confirmation
   clears.
5. Move a middle node up and down; confirm revision increments, selected node
   stays valid, and this is recorded as plumbing evidence only.
6. Drag a reorderable canvas block over a same-parent target; confirm the
   insertion preview appears before drop and no revision increments until drop.
7. Drop the block on a ready target; confirm the backend accepts the mutation,
   revision increments, and selection remains on the moved node.
8. Drag near the top and bottom of the canvas scroll root; confirm only the
   canvas scrolls and the page body does not move.
9. Load `reorder-blocked-target-qa` with
   `VITE_FLOWDOC_DOCUMENT_ID=reorder-blocked-target-qa`, drag over the
   cross-parent target, and confirm blocked affordance appears, no mutation is
   sent, and no raw graph details become the primary visible model.
10. Focus a reorderable canvas block and press `Control/Meta + ArrowUp` or
    `Control/Meta + ArrowDown`; confirm the backend accepts the adjacent
    reorder mutation, revision increments only after acceptance, and selection
    remains on the moved node. Repeat until the moved block crosses a preview
    page boundary; confirm focus stays on the moved node and the next keyboard
    reorder still fires.
