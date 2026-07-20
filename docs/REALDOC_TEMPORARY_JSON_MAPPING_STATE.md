# REALDOC Temporary JSON And Mapping State

Status: `PDF-EXPORT-REALDOC-E.5.5` accepted Editor-owned temporary JSON input,
exact mapping-profile selection, and content-free local diagnostics. Backend
admission, mapping execution, canonical snapshots, exact Preview, and production
remain deferred. Production remains NO-GO.

## Decision

Preview now has one `Form | JSON` mode control. Form retains the accepted E.5.4
state. JSON retains UTF-8 text plus one exact mapping-profile identity for the
active browser session. Switching modes does not discard the other mode.

Both states remain separate from Structure authoring state. E.5.5 prepares an
adapted input for the future E.3 admission call; it does not create the E.1
payload descriptor, run the E.2 mapper, or create authoritative canonical
snapshots in the browser.

## JSON State

The pure memory-only state pins the same Published Structure owner, Structure
fingerprint, generation data-contract fingerprint, and projection fingerprint
as Form state. It retains:

- the exact selected or entered JSON text;
- typed versus local-file source metadata;
- local file name, media type, byte length, and last-modified number;
- exact mapping-profile id, version, and profile fingerprint; and
- local revision, dirty state, syntax-check status, and all downstream
  execution markers.

Any projection-pin change clears all JSON text and profile selection. A mapping
catalog change clears a selected profile that is no longer present by the exact
id, version, and fingerprint. Nothing is written to browser storage, authored
Structure state, logs, analytics, or Backend routes.

## Profile Boundary

The selector consumes a supplied catalog of fingerprinted Core
`VNextPublishedStructureMappingProfileV1` values. It permits selection only when
the profile owner matches the exact Published Structure Version and the target
matches the exact generation data-contract id and fingerprint.

The browser retains no mapper implementation or executable caller code. Named
adapter and declarative mapping execution identities are displayable contract
facts only. Backend remains responsible for resolving the selected id/version
against its trusted allowlisted registry and for verifying the full profile and
mapper execution identity.

## Local Diagnostics

E.5.5 performs only bounded preparation checks:

- JSON input is present;
- UTF-8 length does not exceed the existing local Backend adapted-payload limit
  of 1 MiB;
- JSON syntax can be parsed;
- one exact catalog profile is selected; and
- profile owner and target pins match the active projection.

Diagnostics contain only generated codes, fixed structural paths, generated
messages, counts, and byte length. Parser exception text and supplied JSON
values are never copied into diagnostics. The successful state is named
`ready-for-admission`, not mapped, validated, or generated.

JSON syntax checking may run in the browser for safe input feedback. Mapping,
snapshot creation, runtime validation, materialization, resolution, and artifact
execution all remain `not-run`.

## UI And Activation

The existing Preview workspace now renders Form and JSON modes over one exact
Preview placeholder. JSON mode includes a local file picker, text editor,
profile selector, exact profile facts, and Local checks. There is no Generate
action and the right surface remains `Exact preview not generated`.

Development mode exposes `/__qa/realdoc-e5-5-input` with source-neutral
projection and mapping-profile fixtures. The E.5.4 QA route remains available
for regression checks. Both routes are development-only and absent from the
production build.

Normal documents still have no trusted projection or mapping-profile discovery
transport, so their Preview routes remain fail-closed in
`PreviewUnavailableView`.

## Explicitly Not Changed

- no Backend request, proxy, admission receipt, or profile-discovery route;
- no browser mapper, canonical snapshot, Data Snapshot, or generation instance;
- no Published or Draft Preview execution;
- no exact page, PDF operation, cancel, retry, or download control;
- no JSON or Form refresh persistence;
- no authentication, authorization, tenancy, deployment, or production
  activation; and
- no UAT-, invoice-, or form-specific canonical input shape.

## Evidence

- `src/editor/preview/testInputJsonState.ts` owns pure state and diagnostics;
- `src/app/usePreviewTestInput.ts` owns mode lifetime and local file reading;
- `src/components/preview/PreviewTestInputView.tsx` renders both input modes;
- `src/tests/testInputJsonState.test.ts` covers bounds, identity, redaction, and
  stale reset; and
- `src/tests/realdocTemporaryJsonUi.test.ts` guards UI and local-only activation.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.6` now binds Published Preview to the accepted E.3
admission and E.4 artifact lifecycle with trusted Structure/projection/profile
facts and a sanitized content-free receipt. `PDF-EXPORT-REALDOC-E.5.7` now
accepts the separate Draft Preview identity and admission. E.5.8 next owns
lifecycle UX. Production remains NO-GO.
