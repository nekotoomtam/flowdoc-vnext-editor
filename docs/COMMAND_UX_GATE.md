# Command UX Gate

Status: active
Date: 2026-07-04
Scope: FlowDoc vNext editor command controls before drag/drop UX

## Decision

The Inspector duplicate, delete, move up, and move down controls are an interim
command harness. They prove command policy, backend transport, revision gates,
runtime apply, stale recovery, and history records. They are not the final UX
for structural editing.

## Current Controls

- Duplicate stays available only for operation surfaces that policy marks
  duplicable.
- Delete requires explicit confirmation while undo is unavailable.
- Move up and move down stay available only as scaffold controls for reorder
  plumbing and recovery tests.
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
5. Keyboard or non-pointer reorder fallback must exist before declaring reorder
   UX complete.
6. Stale, rejected, and failed mutation states must keep selection on a valid
   surviving node and show a recoverable status.
7. Manual QA must cover duplicate, delete confirmation, cancel delete,
   successful delete, stale delete, reorder success, reorder rejection, and
   selection recovery.

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
