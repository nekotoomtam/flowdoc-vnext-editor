# Version Capability Reporting

Status: Phase 262 partial package 3/document 4 mutation consumption complete.
Only same-parent `node.reorder` is enabled.

## Outcome

The editor now preflights backend version capability before loading a backend
document or enabling backend mutation. Core version facts remain accessible
only through `src/core/coreAdapter.ts`.

## Capability States

| State | Meaning | Editor behavior |
|---|---|---|
| checking | preflight is pending | fixture remains visible; mutation blocked |
| compatible | backend pairs and operation lists match editor core | v3 mutation and v4 reorder allowed |
| unsupported | contract or version pairs drift | backend package/mutation blocked |
| invalid-response | response shape is malformed | backend package/mutation blocked |
| unavailable | endpoint/network is unavailable | fixture remains visible; mutation blocked |

## Package Read Gate

Every found backend package is inspected for package/document markers before it
enters the core read transport envelope.

- package 2/document 3 continues to the active runtime;
- package 3/document 4 enters the named core v4 read-only session;
- unknown pairs return `unsupported-version`;
- missing or invalid markers return `invalid-version-markers`.

The editor invokes the target parser only through `coreAdapter.ts` and creates
the named v4 read-only session. It never routes v4 through the active session.

## Mutation Gate

Backend mutation commands are disabled until capability status is
`compatible`. This prevents the fixture fallback from sending active-version
commands to a backend whose version contract is unavailable or incompatible.

For a v4 partial working set, only backend-advertised `node.reorder` is enabled.
Text drafts, field-chip insertion, duplicate, delete, live layout, and exact
layout commands remain closed.

The existing backend base-revision and stale-apply gates remain unchanged.

## Persistence Facts

The editor requires backend capability reporting to state:

- migration persistence status;
- `baseRevisionRequired: true`;
- whether source snapshot retention is active.

Current backend status is `available` with source retention true. This is an
operational fact, not permission for the editor to migrate locally or mutate a
returned v4 package.

## PASS

- Core imports remain behind `coreAdapter.ts`.
- Backend capability is checked before backend document loading.
- Migration-target packages use an isolated read-only core session.
- Mutation capability is checked per version pair and operation kind.
- Block and inline images appear as structural placeholders without claiming
  asset-byte or exact-render support.
- Mutation is gated on compatible service capability.
- The status bar exposes the current operational capability state.

## Migration Intent

Phase 261 adds an explicit `Upgrade` command and result workflow. It is enabled
only for fresh backend package 2/document 3 state when migration persistence is
advertised as available. Applied and replayed results are read back and opened
through the v4 read-only session; stale, rejected, invalid, and unavailable
results retain the current editor state. Accepted targets enter partial mode,
not the fully active runtime.

## FAIL / BLOCKER

- Package 3/document 4 cannot delete, duplicate, edit text/images, live-layout,
  exactly render, or export.

## RISK

- Older backends without the capability endpoint now leave the editor on its
  fixture fallback with mutation disabled.
- Capability status is currently session boot state; reconnect/retry UX is not
  implemented.

## UNKNOWN

- Production permission policy and optional migration dry-run presentation.
- Capability refresh cadence after backend deployment changes.

## Intentionally Not Changed

- editor canonical working-set shape;
- selection, viewport, history, jobs, and layout state;
- backend mutation response/stale-apply semantics;
- package migration execution from editor intent;
- v4 mutation, layout, exact renderer, asset-byte resolution, and export.

## Next Recommended Direction

Define v4 delete/duplicate ownership and reference-impact rules before enabling
the next mutation kinds.
