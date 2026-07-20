# REALDOC Temporary Form State

Status: `PDF-EXPORT-REALDOC-E.5.4` accepted Editor-owned temporary Form state
and generated controls. JSON mapping, Preview execution, Backend binding, and
production remain deferred. Production remains NO-GO.

## Decision

Preview may create one temporary Form session only from a ready
`VNextPublishedStructureTestInputProjectionV1`. The projection remains the
authority for field identity, scope, type, order, grouping, collection item
contract, image requirements, and available or unavailable constraint facts.

The Editor owns interaction state only. It does not create a canonical Data
Snapshot, validate generation values, materialize a Document Instance, paginate,
render, or request an artifact in E.5.4.

## State Contract

The memory-only state pins:

- Published Structure owner and version ordinal;
- Structure fingerprint;
- generation data-contract fingerprint; and
- test-input projection fingerprint.

It contains one unset editable value per non-collection document field key and
one separate collection state per collection field key. Repeated presentation
placements never duplicate a document value. State revision and dirty status are
Editor interaction facts, not generation revision or artifact truth.

All execution markers remain `not-run`. The state is not written to authored
Structure state, mutation history, browser storage, Backend routes, logs, or
analytics.

## Generated Controls

The first Form surface supports:

- text, number draft, date, and enum string input;
- an explicit unset/yes/no boolean control;
- PNG or JPEG browser file selection for image fields;
- collection absence versus included-empty state;
- bounded ordered collection item creation and removal;
- required unique `itemKey` editing within each collection; and
- scalar, boolean, and image controls for collection item fields.

Enum choices become a select only when the projection reports exact allowed
values. Date and enum metadata marked `metadata-unavailable` is not guessed.
Document scalar requiredness remains "Requirement unavailable"; collection item
requiredness is shown only when its exact contract fact is available.

The Editor permits at most 100 temporary rows per collection and a 10 MiB local
image selection. Those are operational browser-memory limits, not Structure or
generation constraints.

## Image Boundary

Pure Form state retains only a temporary selection descriptor: local selection
id, file name, accepted media type, byte length, and last-modified number. The
actual `File` stays in an in-memory registry owned by the React hook. No image
bytes, data URL, digest, intrinsic size, media snapshot, or asset reference is
invented in E.5.4.

## Invalidation

Any change to a pinned owner or fingerprint resets the complete temporary Form
session. E.5.4 does not silently carry values across projection versions.
Switching between Design and Preview for the same document keeps the hook alive;
changing the routed document remounts the document-keyed workspace and clears
the session.

## Activation

`EditorShell` renders the generated Form only when both a ready projection and
its initialized state are present. Existing local documents have no accepted
projection transport, so their normal Preview routes continue to render
`PreviewUnavailableView` with migration-required or unavailable status.

Development mode exposes `/__qa/realdoc-e5-4-form` with a source-neutral fixture
covering scalar, boolean, image, collection, and unplaced controls. The route is
guarded by `import.meta.env.DEV`; it is not a production product route and the
fixture is not canonical generation evidence.

## Explicitly Not Changed

- no JSON payload or mapping-profile selection;
- no browser mapper or authoritative snapshot creation;
- no Published or Draft Preview admission;
- no exact generated pages or artifact controls;
- no Backend route, repository, worker, or lifecycle change;
- no browser refresh persistence; and
- no authentication, authorization, tenancy, deployment, or production
  activation.

## Evidence

- `src/editor/preview/testInputFormState.ts` owns the pure state and commands;
- `src/app/usePreviewTestInputForm.ts` owns session lifetime and selected files;
- `src/components/preview/PreviewTestInputView.tsx` generates the controls;
- `src/tests/testInputFormState.test.ts` covers types, bounds, identity, and
  stale resets; and
- `src/tests/realdocTemporaryFormUi.test.ts` guards UI and local-only activation.

Desktop and mobile browser checks pass without horizontal page overflow. Form
editing, collection inclusion, row creation, and duplicate `itemKey` feedback
work. Normal document Preview remains unavailable and browser console errors are
empty.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.5` now accepts separate temporary JSON selection, exact
mapping-profile selection, and content-free local preparation diagnostics. Form
and JSON state survive mode switches independently. E.5.6 now binds Published
Preview; E.5.7 accepts Draft Preview and E.5.8 next owns lifecycle UX.
Production remains NO-GO.
