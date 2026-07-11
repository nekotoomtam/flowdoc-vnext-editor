# Version Capability Reporting

Status: Phase 258 editor capability consumption complete. Package 3/document 4
remains outside the active editor runtime.

## Outcome

The editor now preflights backend version capability before loading a backend
document or enabling backend mutation. Core version facts remain accessible
only through `src/core/coreAdapter.ts`.

## Capability States

| State | Meaning | Editor behavior |
|---|---|---|
| checking | preflight is pending | fixture remains visible; mutation blocked |
| compatible | backend active pair matches editor core | backend read and mutation allowed |
| unsupported | contract or version pairs drift | backend package/mutation blocked |
| invalid-response | response shape is malformed | backend package/mutation blocked |
| unavailable | endpoint/network is unavailable | fixture remains visible; mutation blocked |

## Package Read Gate

Every found backend package is inspected for package/document markers before it
enters the core read transport envelope.

- package 2/document 3 continues to the active runtime;
- package 3/document 4 returns `unsupported-version` with
  `migration-required`;
- unknown pairs return `unsupported-version`;
- missing or invalid markers return `invalid-version-markers`.

The editor does not invoke the target parser or create a v4 runtime session.

## Mutation Gate

Backend mutation commands are disabled until capability status is
`compatible`. This prevents the fixture fallback from sending active-version
commands to a backend whose version contract is unavailable or incompatible.

The existing backend base-revision and stale-apply gates remain unchanged.

## Persistence Facts

The editor requires backend capability reporting to state:

- migration persistence status;
- `baseRevisionRequired: true`;
- whether source snapshot retention is active.

Current backend status is `not-wired` with source retention false. This is an
operational fact, not permission for the editor to migrate locally.

## PASS

- Core imports remain behind `coreAdapter.ts`.
- Backend capability is checked before backend document loading.
- Migration-target packages are blocked before active runtime parsing.
- Mutation is gated on compatible service capability.
- The status bar exposes the current operational capability state.

## FAIL / BLOCKER

- No migration request UI or transport exists.
- Backend revisioned migration persistence remains unavailable.
- Package 3/document 4 cannot be edited or rendered by the active editor.

## RISK

- Older backends without the capability endpoint now leave the editor on its
  fixture fallback with mutation disabled.
- Capability status is currently session boot state; reconnect/retry UX is not
  implemented.

## UNKNOWN

- User-facing migration offer and blocked-issue presentation.
- Capability refresh cadence after backend deployment changes.

## Intentionally Not Changed

- editor canonical working-set shape;
- selection, viewport, history, jobs, and layout state;
- backend mutation response/stale-apply semantics;
- package migration execution;
- v4 runtime, layout, renderer, and export behavior.

## Next Recommended Direction

Add the backend revision-gated migration request/result contract and source
snapshot retention before exposing an explicit migration command in the editor.
