# REALDOC DocGen Pre-Test Boundary

Status: `PDF-EXPORT-REALDOC-E.0` Editor product-role lock. No UI or runtime
change; production remains NO-GO.

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

- no Editor route, component, hook, state, proxy, parser, or command change;
- no test-data import UI is activated;
- no Structure publish or storage implementation is added;
- no browser mapping or PDF generation is added;
- no current LOCAL-F eligibility or request body changes; and
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
- Draft preview versus Published Structure exact-preview policy.
- Whether pre-test generation instances are temporary or reopenable.

## Next Phase

`PDF-EXPORT-REALDOC-E.1` Published Structure generation input and mapping
contract in Core/Backend before pre-test UI implementation.
