# REALDOC DocGen Pre-Test Boundary

Status: `PDF-EXPORT-REALDOC-E.0` Editor product-role lock retained through the
accepted E.1 generation input, E.2 Core runtime, E.3 bounded local Backend
admission, E.4 local artifact lifecycle, E.5.0 workspace product contract,
E.5.1 Library, E.5.2 workspace tabs, E.5.3 Core test-input projection, E.5.4
temporary generated Form, E.5.5 temporary JSON/mapping preparation, E.5.6
local Published Preview, E.5.7 local Draft Preview, E.5.8 lifecycle UX, and
E.5.9 Form/API canonical-content parity. Production remains NO-GO.

## Product Role

The FlowDoc Editor is the direct-manipulation authoring surface for Structure
Definition drafts. Users may work on a page-like canvas, but the primary saved
and published artifact is a reusable document structure, not one generated
business-data instance and not a PDF.

The Structure owns field definitions, field placements, presentation choices,
authored content, styles, tables, columns, media placement, and accepted
composition rules. Field values imported for a test remain separate data.

## Field And Presentation UX

The Editor must allow a field definition to be placed wherever the Structure
permits and to be presented differently at different placements. A field is not
created with one permanent page coordinate. Final geometry belongs to Core
measurement and pagination after data resolution.

The field/catalog UI and the outline/canvas UI therefore edit related but
separate facts:

```text
field catalog: semantic identity, type, requirement, compatibility
outline/canvas: placement, container, presentation, style, composition rule
test payload: temporary value and source mapping evidence
```

Moving a field placement, showing one field twice, changing a table into a
different accepted presentation, or changing book structure must not require
the external caller to send page or renderer facts.

## Pre-Test Role

Pre-test lets an author choose or import representative data, inspect mapping
and validation diagnostics, view the resolved outline, request exact preview,
and exercise export/cancel/retry/download before an external system integrates.

Pre-test state is separate from Structure authoring state:

- selected draft or Published Structure Version;
- selected test input or mapping profile;
- test payload identity and local selection state;
- Backend-returned mapping/validation diagnostics;
- resolved preview operation and stale-result gates; and
- local artifact lifecycle status.

Imported values must not be written into field definitions, published starter
content, or durable template truth. Changing the Structure revision invalidates
stale diagnostics and previews. Changing test data invalidates downstream
resolved, measured, and artifact identities without mutating the Structure.

## Shared DocGen Path

The exact pre-test path is Backend-owned:

```text
Editor selects Structure and test payload
  -> same-origin development transport
  -> Backend DocGen admission
  -> source mapping or direct canonical Data Snapshot validation
  -> Core materialization / resolution / measurement / pagination
  -> Backend artifact lifecycle
  -> Editor receives redacted diagnostics, status, preview, and download
```

An external API caller enters the same Backend boundary. The browser may parse
a file enough to support file selection and safe UX, but it does not become the
canonical mapper, resolver, paginator, renderer, storage owner, or artifact
authority.

## E.1 Pre-Test Handoff

Core now accepts one pure planning contract after trusted Backend admission:

- direct canonical snapshots stop at `runtime-validation-required`; and
- adapted JSON is represented by a content-free payload descriptor and exact
  mapping profile, then stops at `mapping-required`.

The future Editor pre-test may select a local JSON file, show its local name
and size, choose an allowed mapping profile, and submit it through the
same-origin development transport. Backend remains responsible for the exact
payload-byte fingerprint, Published Structure/data-contract/instance pins,
mapping execution, canonical snapshots, and redacted diagnostics.

No E.1 contract is stored in authored Structure state. No raw payload, mapped
value, layout fact, renderer fact, or browser-generated snapshot becomes
authoritative. The current transport still sends only `documentId` and
`documentRevision`; E.1 adds no UI, hook, parser, state, proxy, or route.

## E.2 Pre-Test Handoff

Core now proves that direct canonical snapshots and identity-pinned adapted
JSON can converge on the same validated canonical snapshot fingerprint. Exact
payload bytes are checked before mapping, mapper exceptions are redacted, and
diagnostics contain codes, structural paths, counts, and fingerprints rather
than supplied business values.

This does not move mapping into the Editor. In the future pre-test flow, the
browser may select a file and mapping profile, but Backend must fingerprint the
admitted bytes, select the allowlisted mapper, allocate/load the generation
instance, and call the same Core runtime used by an external API caller. The
browser cannot submit executable mapper code or authoritative canonical
snapshots for an adapted payload.

Ready canonical snapshots contain test business data and belong only to the
protected generation operation. Editor lifecycle state should retain operation
identity, content-free diagnostics, stale gates, and artifact status, not copy
the canonical values into authored Structure state or general client logs.

E.2 adds no file picker, mapping-profile selector, diagnostics panel, state,
hook, request body, proxy, preview, or route. The current local transport still
sends only `documentId` and `documentRevision`.

## E.3 Pre-Test Handoff

Backend now accepts one strict local DocGen request at the optional loopback
`POST /docgen-local/admissions` route. The request pins one Published Structure
Version, digest-bound assets, and either direct canonical data/collections or
an exact mapping-profile identity plus ephemeral JSON text. Backend derives
tenant/principal from authentication, authorizes the exact Structure, creates
the revision-0 instance, selects an allowlisted mapper, verifies asset bytes,
and calls the same Core E.2 runtime used for API-shaped callers.

The local HTTP envelope is capped at 2 MiB and adapted JSON at 1 MiB of UTF-8.
Successful business values live only in a protected in-memory Backend record.
The public receipt exposes content-free identities, fingerprints, counts, and
diagnostics and stops at `materialization`; no preview or PDF artifact exists
yet. Exact idempotency replay does not rerun mapping.

This phase deliberately does not connect the Editor. The existing LOCAL-F
transport still sends only a current `documentId` and `documentRevision`; it is
not silently widened or relabeled. E.5.1 through E.5.9 add pre-test UX only
after E.4 has connected the admitted canonical record to the shared artifact
lifecycle.

## E.4 Pre-Test Handoff

Backend now accepts the E.3 `instanceId` and revision through the existing
`POST /pdf-exports` route, resolves only the protected canonical record, and
reuses the existing worker, cancellation, persistence, status, and verified
download lifecycle. The 69C section completes as a 10-page local artifact;
route replay does not rematerialize and cancellation before worker persists no
bytes.

This phase still deliberately does not connect the Editor. Later E.5 phases may
reuse the existing lifecycle controls only after a new pre-test state admits
one exact Published Structure plus selected test data. The browser must retain
the content-free admission receipt and operation status, not canonical
business values or measured contracts.

## E.5.0 Product Contract Lock

`docs/REALDOC_DOCUMENT_WORKSPACE_PRODUCT_CONTRACT.md` now locks the first
Editor product shape without activating it. A local Document Library opens one
document workspace with URL-backed `Design` and `Preview` top views. Design
keeps the current Structure authoring shell. Preview owns temporary Form or JSON
test input, diagnostics, exact generated pages, and artifact controls without
writing values into Structure state.

Form controls must come from a Core UI-neutral test-input projection. One field
key produces one input even when placed multiple times. The projection may use
only accepted generation data-contract facts and must expose missing scalar
requiredness, enum choices, or other constraints rather than inventing them.

Published Preview reuses E.3/E.4 and remains the API-parity target. Draft
Preview requires a separate immutable local draft snapshot and cannot pretend
to be a Published Structure Version. Structure, target, test input, mapping,
or asset changes mark downstream Preview results stale.

## Existing Local PDF Controls

LOCAL-F and LOCAL-G remain a development-only canonical evidence workflow. The
current UI checks one Editor working-set `documentId` and `documentRevision`,
then requests status/cancel/download through the local proxy. That proves stale
gates and lifecycle ergonomics, but it is not the future DocGen input envelope.

REALDOC-E.0 does not relabel the current product document as eligible and does
not substitute 69C data into the working set. Later E phases may reuse lifecycle
controls after Backend admits a Published Structure plus test payload through
the new generation contract.

## Book-Form UX Pressure

Pre-test and preview must remain useful when data changes section count, table
length, image count, generated entries, and total pages. The Editor should
surface outline and exact-preview results without computing final page breaks
from DOM measurements. Long-document virtualization and interaction remain
Editor responsibilities; pagination truth remains Core/backend output.

## Explicitly Not Changed

- no Structure publish or storage implementation is added;
- no browser mapping, canonical-value exposure, pagination, or rendering;
- no current LOCAL-F eligibility or request body changes;
- no Form draft admission or mapped-value hydration into Form controls;
- no arbitrary live-draft compiler or durable Draft snapshot repository; and
- no production route, credential, provider, deployment, or activation.

## RISK

- The phrase "document editor" can obscure that the saved product artifact is
  a Structure Definition.
- Reusing the current document-pin request as DocGen would omit Structure,
  mapping, payload, Data Snapshot, and asset identities.
- Draft-local sample preview can drift from exact Backend generation unless its
  scope and stale state are visible.

## UNKNOWN

- Test payload file formats and size limits.
- Mapping authoring UX and diagnostics presentation.
- Scalar generation constraints needed by an accessible generated Form.
- Whether pre-test generation instances are temporary or reopenable.

## E.5.1 Local Library

`docs/REALDOC_DOCUMENT_LIBRARY.md` accepts the bounded content-free Backend
list transport, `/documents` Library, and `/documents/:documentId/design`
handoff. It stores no imported values and keeps Preview unavailable.

## E.5.3 Projection Handoff

Core now accepts exact Published Structure, generation data-contract, and table
binding pins and returns one deterministic UI-neutral input projection. It
retains one document value identity per field key, first-placement section
order, unplaced contract fields, collection item scope, and image/media
requirements. Missing scalar requiredness, enum choices, date format, and item
limits remain explicit metadata-unavailable facts.

The Editor has not consumed this projection yet. No temporary values, canonical
snapshots, Backend admission, generation instance, Preview pages, or artifact
lifecycle call are created in E.5.3.

## E.5.4 Temporary Form Handoff

Editor now owns one memory-only Form session over a ready Core projection. It
generates scalar, boolean, image, collection, collection-item, and unplaced
controls without guessing missing generation metadata. Collection absence and
included-empty remain distinct, item keys are collection-local and unique, and
selected image files remain outside pure state.

The state pins exact Structure, data-contract, and projection identity. Any pin
change clears all temporary values. Normal document Preview remains unavailable
until a trusted projection transport exists. No canonical snapshot, validation,
mapping, materialization, exact page, Backend call, or artifact is created.

## E.5.5 Temporary JSON And Mapping Handoff

Editor now retains selected or entered JSON text plus one exact mapping-profile
id, version, and fingerprint in memory for the active Preview session. The
profile must be present in the supplied catalog and match the exact Published
Structure owner and generation data-contract target. Switching Form/JSON modes
preserves each mode independently.

Local checks cover presence, the existing 1 MiB adapted JSON limit, JSON syntax,
profile availability, and owner/target compatibility. Diagnostics contain only
generated codes, structural paths, generated messages, counts, and byte length;
they never contain supplied values or parser exception text.

This state is only `ready-for-admission`. Mapping, canonical snapshot creation,
runtime validation, materialization, exact pages, Backend admission, and
artifact execution remain `not-run`. Normal Preview stays unavailable until
trusted projection and profile discovery are connected.

## E.5.6 Published Preview Handoff

Editor now loads one exact value-free Published Preview context from Backend.
The context carries the trusted E.5.3 projection, canonical mapping profiles,
asset admission template, and existing 1 MiB payload limit. Its strict parser
rejects owner/target/privacy drift and any unexpected receipt fields.

JSON mode submits the imported payload to E.3, then submits the returned
revision-zero instance pin to E.4. Mapping executes only in Backend. Editor keeps
a sanitized content-free receipt, public operation state, and the exact PDF URL;
it never receives mapped canonical business values.

Form mode now exposes read-only `Form data JSON`, but that object remains
memory-only with status `draft-not-validated` and is not admitted in E.5.6.
Payload/profile/context changes mark the prior artifact stale and remove its
iframe and Download action.

The local 69C browser path imports 749,929 bytes, reports `executed`,
`run-valid`, and 3 warnings, and displays the completed 10-page artifact. Desktop
and mobile have no horizontal page overflow or console errors. The complete
200-page export remains REALDOC-G.

## E.5.9 Form/API Parity Handoff

Editor now projects its exact dynamic Form state into direct canonical data and
collections, then submits them to Backend admission. It does not allocate
canonical identity or perform authoritative validation. External JSON still
uses the exact adapted mapping profile, and Backend/Core report one shared
canonical content fingerprint when the two lanes produce the same values.

The Form pane may import canonical-data or a ready Form candidate, including
UTF-8 JSON with a BOM. Import hydrates only fields and collections present in
the active projection. Mapped values still do not return from Backend or mutate
authored Structure state.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.6` now accepts local Published Preview through E.3/E.4
without making the browser mapper or artifact truth. E.5.7 now accepts the
separate immutable Draft Preview identity and admission. E.5.8 now accepts
lifecycle UX; E.5.9 now accepts Form/API canonical-content parity. E.6 next
owns restart, failure, and cross-repo lifecycle acceptance. No multi-user
authorization is claimed. Production remains NO-GO.
