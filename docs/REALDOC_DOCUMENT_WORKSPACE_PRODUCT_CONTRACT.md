# REALDOC Document Workspace Product Contract

Status: `PDF-EXPORT-REALDOC-E.5.0` product contract accepted and
`PDF-EXPORT-REALDOC-E.5.1` local Library, `E.5.2` shared workspace tabs, and
`E.5.3` Core test-input projection, `E.5.4` temporary generated Form, and
`E.5.5` temporary JSON/mapping preparation, `E.5.6` local Published Preview,
and `E.5.7` local Draft Preview accepted.
`PDF-EXPORT-REALDOC-E.5.8` local Preview lifecycle and large-input UX is also
accepted.
Production remains NO-GO.

## Decision

FlowDoc presents one document workspace with two top-level views:

```text
Document Library -> Document Workspace -> Design | Preview
```

Design and Preview are close in the user journey but retain separate state and
authority. Design edits a reusable Structure Definition draft. Preview supplies
temporary test data to DocGen and inspects derived output. Test values never
become authored Structure content, and browser rendering never becomes exact
page or artifact truth.

The user-facing term "document" names one Structure authoring project in the
Library. It does not mean one generated Document Instance or one PDF artifact.

## Current Baseline

The accepted Editor now:

- starts at the routed local Document Library `/documents`;
- reads bounded content-free metadata through `GET /documents`;
- opens `/documents/:documentId/design` and loads one Backend authoring package
  through `GET /documents/:documentId`;
- receives a draft Structure authoring context only after the package V4
  migration;
- renders one design shell with header, toolbar, outline, canvas, inspector,
  diagnostics, and status bar;
- retains that Design runtime while URL-backed Design/Preview views switch;
- reports an honest content-free Preview unavailable state when no accepted
  projection is bound;
- owns memory-only generated Form and JSON/mapping preparation state after
  accepted projection and profile-catalog facts are bound;
- runs local Published or Draft Preview only when the corresponding trusted
  Backend context is bound;
- exposes content-free cancellation, retry, status, diagnostics, and download
  lifecycle controls for an active exact Preview; and
- exposes LOCAL-F PDF controls for the current document/revision pin only.

Backend has both `read(documentId)` and a bounded newest-first list query.
Existing LOCAL-F PDF controls are reusable lifecycle evidence, not the DocGen
Preview transport. Documents without a trusted Draft or Published context
remain fail-closed.

## Navigation Contract

The first accepted browser routes are:

| Route | Meaning |
| --- | --- |
| `/documents` | Local Document Library |
| `/documents/:documentId/design` | Structure draft authoring view |
| `/documents/:documentId/preview` | Test-data and DocGen preview view |

`documentId` identifies the Backend authoring record used to open the
workspace. It is not a DocGen instance id and must not be substituted for the
Published Structure Version identity used by generation.

The selected top tab is URL state. Reload, direct navigation, and browser
back/forward must preserve Design versus Preview. Returning to the Library must
not require a modal that asks the user to choose a mode. A Library item may
offer direct Design and Preview actions, while opening the item defaults to
Design until a retained last-view policy is separately accepted.

## Local Library Read Model

E.5.1 adds a bounded local read model instead of exposing raw package records.
Each item needs only:

- authoring `documentId`;
- title;
- current revision and `updatedAt`;
- draft Structure identity when available;
- latest Published Structure Version summary when available;
- authoring status such as `ready`, `migration-required`, or `unavailable`;
- Design and Preview capability states; and
- an optional Structure-derived thumbnail reference or explicit placeholder.

The Library contains no test payload values, canonical snapshots, generated
instance values, PDF bytes, or raw package graph. Preview capability must be
derived rather than inferred in the browser.

There is no accepted multi-user authorization system yet. E.5.1 is explicitly
local-workspace only and must not claim that its list is securely user-scoped.
A later authenticated query will inject tenant/workspace/principal scope before
repository access; the browser must never choose another owner through a query
parameter.

## Workspace Header

Design and Preview share one stable header:

```text
Back to Library | document title | Design / Preview | version and publish status | actions
```

The centered Design/Preview control is view navigation, not a mutation. The
right side owns version/publish status and explicit commands. Existing editing
tools remain inside Design. Preview-specific run, cancel, retry, and download
controls remain inside Preview.

Changing tabs must not discard unsaved Design state or the selected local test
dataset. Cross-view selection linking may be added later, but a diagnostic may
never mutate the Structure merely because the user navigated to Design.

## Design View

The current Editor shell remains the Design view. It owns Structure draft
content, field definitions, placements, authored styles, outline, canvas,
inspector, diagnostics, and authoring commands.

Design does not store test values in field definitions, starter content, node
props, undo history, mutation receipts, or the package data snapshot. A field
may be placed many times while still producing one input in Preview.

## Preview View

Preview combines three responsibilities in one view without merging their
state:

1. select or edit temporary test input;
2. inspect validation/mapping diagnostics; and
3. inspect exact generated pages and the artifact lifecycle.

The primary layout may use a test-input sidebar and an exact page surface. It
must remain usable for long documents, repeated collections, and multiple
images. Browser DOM measurement is not pagination truth.

Preview exposes two input modes through one mode control:

- `Form`: values entered against a generated test-input projection and sent as
  the direct canonical input lane; and
- `JSON`: admitted UTF-8 JSON plus one exact mapping profile, sent through the
  adapted payload lane.

Both modes must converge on the same Core canonical snapshot validator before
materialization. Form mode is not a browser mapper, and JSON mode does not
allow browser-provided mapper code.

## Generated Form Boundary

Core must expose a UI-neutral test-input projection. Editor maps that
projection to familiar controls; Core does not name React components, CSS,
panels, or screen coordinates.

The projection must pin its exact Structure owner and generation data contract
and describe, at minimum:

- stable field key and label;
- scalar or collection scope;
- value type;
- required/default facts when represented by the accepted data contract;
- allowed values or an explicit metadata-unavailable state;
- first-placement document order and section grouping;
- collection item fields and repeat capability; and
- image asset-input requirements.

One field key produces one Form value even when the Structure places that field
multiple times. Collection fields produce a bounded row editor from their item
contract. Document presentation placement controls output, not input identity.

The current scalar Field Contract contains `key`, `label`, `type`, and optional
fallback text, but it does not represent scalar requiredness, enum choices,
date constraints, multiline intent, or input help. Core must not invent these
facts. E.5.3 therefore reports those facts as metadata unavailable instead of
claiming richer controls. Collection item requiredness already exists and is
projected exactly.

## State Ownership

The workspace retains four separate state families:

| State | Owner | May contain business values |
| --- | --- | --- |
| Library state | Editor read model | No |
| Structure draft state | Editor/Backend authoring | Authored content only |
| Test input state | Editor Preview session | Yes, temporary |
| Generation/artifact state | Backend protected runtime | Canonical values only in protected records |

Editor test input state may retain local Form values or selected JSON text for
the active session. It must not copy them into general logs, lifecycle status,
analytics, authored Structure state, or content-free receipts. Browser refresh
retention is deferred until an explicit privacy and local-storage policy is
accepted.

## Preview Targets

Preview has two explicit targets:

- `Published`: one exact Published Structure Version using the accepted E.3
  admission and E.4 artifact lifecycle. This is the API-parity target.
- `Draft`: one immutable local draft snapshot used to decide whether the
  Structure is ready to publish. It must be visibly labeled as Draft Preview.

Draft Preview cannot call the Published admission route while pretending that a
draft is a Published Structure Version. E.5.7 now defines a separate local-only
draft snapshot identity and admission boundary that converges with shared Core
generation and artifact execution after ownership validation.
A Draft artifact cannot be presented as API-parity evidence.

## Staleness Contract

Every Preview result pins:

- authoring document id and revision;
- draft snapshot or Published Structure Version identity;
- test-input mode and dataset/payload fingerprint;
- mapping profile identity when applicable;
- canonical snapshot fingerprint;
- generated instance and revision;
- measured contract fingerprint; and
- artifact operation identity.

The UI applies these invalidation rules:

| Change | Required result |
| --- | --- |
| Structure revision changes | Input projection, validation, preview, and artifact become stale |
| Preview target/version changes | Test validation and every downstream result become stale |
| Form value changes | Canonical snapshot, preview, and artifact become stale |
| JSON bytes or mapping profile change | Mapping diagnostics and every downstream result become stale |
| Asset bytes or registry change | Admission and every downstream result become stale |
| Navigation only | No identity changes |

Compatible Form values may remain visible after a Structure change, keyed by
field key, but they must be revalidated before reuse. Removed or incompatible
values are reported and never silently coerced.

## Preview Lifecycle

Each target uses its own admission before reusing the accepted lifecycle in
this order:

```text
select target and input
  -> validate or map
  -> content-free admission receipt
  -> request PDF operation
  -> status / cancel / retry
  -> verified download
```

The browser keeps public identities, diagnostics, and status. Backend keeps the
protected canonical generation record, measured contract, trusted resources,
operation, and artifact bytes. Editor does not render an approximate page and
label it exact while the Backend result is pending.

## Phase Order

1. `E.5.0` locks this product and ownership contract. Accepted.
2. `E.5.1` adds the bounded local Library read model and Library route/view.
   Accepted.
3. `E.5.2` adds the shared workspace shell and URL-backed Design/Preview tabs.
   Accepted.
4. `E.5.3` adds the Core UI-neutral test-input projection and missing generation
   value constraints without UI vocabulary. Accepted.
5. `E.5.4` adds Editor Form state and generated scalar/collection/image inputs.
   Accepted.
6. `E.5.5` adds JSON selection, mapping-profile selection, and diagnostics.
   Accepted.
7. `E.5.6` binds Published Preview to E.3/E.4. Accepted for local development.
8. `E.5.7` adds the separate local Draft Preview identity and admission path.
   Accepted for local development.
9. `E.5.8` completes stale, rerun, diagnostic navigation, empty, loading,
   failure, cancel, retry, download, and bounded large-input states. Accepted
   for local development.
10. `E.5.9` accepts Form/API canonical parity.
11. `E.6` accepts cross-repo identity, restart, failure, and lifecycle evidence.

## Explicitly Not Changed

- no mapped canonical values in Editor state;
- no Form or test-data persistence beyond the active memory session;
- no Published Preview binding for documents without a trusted Backend context;
- no durable Draft Preview repository or arbitrary live-draft compiler;
- no Structure publish implementation;
- no authentication, authorization, sharing, folders, or collaboration;
- no production route, provider, deployment, cost, or activation; and
- no fixed UAT, invoice, or form-specific field catalog.

## PASS

- Library items are Structure projects rather than generated artifacts.
- The bounded local response excludes raw package and generated content.
- Library-to-Design navigation and Back-to-Library URL state are active.
- Design/Preview tabs, direct URLs, and browser history share one view state.
- Switching views preserves the document-keyed Design runtime.
- Design and Preview are adjacent views with separate state authority.
- Form and JSON input converge before canonical resolution.
- Generated Form behavior is source-neutral and does not guess missing schema.
- The accepted Core projection retains unplaced fields and reports missing
  scalar constraints explicitly.
- The generated Form keeps one value per field key, collection absence distinct
  from included-empty, and selected image bytes outside pure state.
- Draft and Published Preview identities cannot be confused.
- Stale results are explicit and content-free lifecycle boundaries remain intact.
- Pending cancellation, terminal retry, Backend failure recovery, and verified
  download are explicit local Preview interactions.

## RISK

- Current Backend records mix legacy package identity and draft authoring
  context; the Library read model must expose capability without leaking that
  storage shape.
- Scalar generation metadata is insufficient for a complete accessible Form.
- Draft Preview compilation from arbitrary live authoring packages remains
  unimplemented after the accepted trusted local snapshot boundary.
- Local test values need a privacy decision before refresh persistence.

## UNKNOWN

- Exact publish workflow and Published Structure repository used by the Library.
- Accepted scalar constraint vocabulary beyond requiredness and enum choices.
- Mapping-profile discovery and selection API.
- Draft Preview retention and reopen policy.
- Thumbnail generation and invalidation policy.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.8` now accepts complete local Preview lifecycle,
content-free diagnostic navigation, and bounded large-input UX for both Draft
and Published targets. E.5.9 next owns Form/API canonical parity; E.6 retains
cross-repo restart and lifecycle acceptance. Production remains NO-GO.
