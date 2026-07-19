# REALDOC Test-Input Projection Handoff

Status: `PDF-EXPORT-REALDOC-E.5.3` Core projection and
`PDF-EXPORT-REALDOC-E.5.4` Editor temporary Form accepted. Preview execution
remains inactive. Production remains NO-GO.

## Accepted Core Boundary

Core now exposes a versioned pure projection from one exact Published Structure
owner/fingerprint, generation data contract, Document V4 graph, and relevant
Published table definition/binding contracts.

The result provides:

- one document value identity per field key regardless of placement count;
- first-placement order and Structure section groups;
- one explicit `unplaced` group for contract fields not present in the graph;
- scalar, collection, and collection-item value types;
- exact collection item requiredness and accepted typed defaults;
- explicit unavailable scalar requiredness, enum choices, and date format;
- ordered repeat and unique `itemKey` requirements; and
- image references pinned to the instance media snapshot.

The projection contains authored labels and accepted contract defaults. It
contains no caller test value, raw JSON, canonical snapshot, generation
instance, media bytes, operation, or artifact.

## Editor Consumption Rule

E.5.4 translates the projection into familiar inputs, and the Editor must
not reinterpret it as authored Structure state. Temporary values remain keyed
by projection owner, Structure fingerprint, data-contract fingerprint, and
field scope.

The Editor must preserve these Core distinctions:

- `metadata-unavailable` is not optional or required;
- document fallback text is not a generation default;
- `unplaced` means accepted by the data contract but absent from presentation;
- collection item keys are unique within one collection;
- an image value is an asset reference, not embedded arbitrary text; and
- projection readiness is not runtime validation or Preview readiness.

E.5.4 applies a bounded local editing limit for collection rows and image
selection. That operational limit must not be presented as a Structure or
generation semantic constraint while Core reports item limits unavailable.

## Current Workspace State

The Preview route renders the generated Form only when a ready projection is
explicitly bound. Current local documents have no projection transport, so they
still render `PreviewUnavailableView`. The local development QA route exercises
the Form without claiming canonical or production evidence.

No Backend transport, browser storage, canonical snapshot, runtime validation,
or exact page generation is part of E.5.4.

## Applied Stale Pins In E.5.4

The first temporary Form state must be invalidated or revalidated when any of
these facts changes:

- document/Structure owner or fingerprint;
- generation data-contract fingerprint;
- table definition or binding fingerprint; or
- projection fingerprint.

Values may be preserved by exact compatible field key only after explicit
revalidation. Removed fields, changed scopes, and incompatible value types
must not silently survive.

## Explicitly Not Changed

- no Form/JSON values or persistence;
- no Published or Draft Preview admission;
- no mapping profile selection or browser mapper;
- no canonical snapshot or generation instance;
- no artifact status, cancel, retry, or download call;
- no Structure publish workflow; and
- no authentication, authorization, tenancy, provider, deployment, cost, or
  production activation.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.5` now accepts temporary JSON selection, exact
mapping-profile selection, and content-free local preparation diagnostics.
Mapping and Preview execution remain `not-run`. E.5.6 next binds Published
Preview. Production remains NO-GO.
