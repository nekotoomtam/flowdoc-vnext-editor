# Version Capability Reporting

Status: package 3/document 4 mutation transport integration complete. Generic
node lifecycle remains enabled in the UI; rich-inline intent is integrated but
the WYSIWYG input surface remains closed.

## Outcome

The editor now preflights backend version capability before loading a backend
document or enabling backend mutation. Core version facts remain accessible
only through `src/core/coreAdapter.ts`.

## Capability States

| State | Meaning | Editor behavior |
|---|---|---|
| checking | preflight is pending | fixture remains visible; mutation blocked |
| compatible | backend pairs and operation lists match editor contracts | v3 mutation and advertised v4 operations may cross transport |
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

For a v4 partial working set, backend-advertised generic node lifecycle
operations are enabled in the existing UI. The editor can also build a
`text-block.rich-inline.replace` request from children accepted by the core
adapter grammar and stale-gate its response. No text draft, field-chip input,
IME, live layout, or exact layout UI is activated by that integration.

Applied mutation envelopes must report new or replayed idempotency. The
existing backend base-revision and editor stale-apply gates remain unchanged.

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
- Core inline grammar is consumed only through `coreAdapter.ts`.
- Rich-inline intent carries children and a target id, not structure policy or
  session permissions.
- Block and inline images appear as structural placeholders without claiming
  asset-byte or exact-render support.
- Block images retain generic lifecycle capability on the explicit `media`
  operation surface rather than being classified as utility nodes.
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

- Package 3/document 4 has no WYSIWYG text/image input, live-layout, exact
  renderer, or export workflow.

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
- backend-owned structure policy and session permissions;
- package migration execution from editor intent;
- v4 WYSIWYG input, layout, exact renderer, asset-byte resolution, and export.

## Next Recommended Direction

Design the explicit text-draft/IME gate and editor-local draft state before
connecting the integrated rich-inline intent to a visible editing surface.
