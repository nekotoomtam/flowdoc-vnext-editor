# REALDOC Form/API Parity

Status: `PDF-EXPORT-REALDOC-E.5.9` accepted for local Editor pre-test.
Production remains NO-GO.

## Dynamic Form Contract

Form controls remain generated from the exact Core test-input projection. The
Editor does not ship a fixed UAT, invoice, or form-specific request shape.
Scalar fields, booleans, images, collections, item fields, ordering, and
unplaced fields follow the selected Structure and data-contract projection.

Form interaction stays memory-only. It projects to an
`editor-form-canonical-candidate` with direct canonical data and collections,
but that candidate is only `ready-for-admission`. It assigns no canonical
instance identity and still requires Backend validation.

## Import And Candidate UX

The Form pane exposes the generated candidate and supports:

- importing a local canonical-data or ready candidate JSON file;
- pasting and applying the same JSON for test workflows;
- UTF-8 JSON with or without a BOM;
- exact projected scalar and collection hydration; and
- image references only when asset id, media type, byte length, and SHA-256
  match a Backend-admitted asset.

Unknown fields, wrong value kinds, non-finite numbers, untrusted images,
oversized input, and malformed JSON fail closed. Import never creates fields
that are absent from the active projection.

## Shared Preview Lifecycle

Generate PDF chooses its admission lane from the active mode:

```text
Form candidate -> admitCanonicalForm -> canonical-data
JSON payload   -> admitAdaptedJson   -> adapted-json + exact profile
```

Draft and Published clients both support direct Form admission. They then use
the same existing operation, polling, cancellation, retry, stale-result,
diagnostic, PDF, and download lifecycle. Draft still carries its distinct
snapshot identity and does not claim Published/API parity.

The Editor strictly parses content-free receipts and displays input lane,
mapping result, runtime validation, warning count, and a shortened canonical
content fingerprint. It never receives mapped canonical business values.

## Browser Ownership Boundary

The browser owns Form interaction, local file selection, mode state, and
presentation. It is not the mapper, validator, instance allocator, resolver,
paginator, renderer, artifact store, or download authority. Canonical candidate
readiness therefore means only that the request can be sent to Backend.

Form values remain separate from authored Structure state. A changed
projection pin resets Form state; changed input or target marks an existing PDF
stale and prevents it from masquerading as current truth.

## Accepted QA

Development route `/__qa/realdoc-e5-9-form-api-parity` uses the trusted 69C
contexts. Browser QA imported the direct canonical input, produced Revision 1,
retained 10 requirement rows and 7 screenshot rows, and reported the candidate
ready for Backend validation.

The direct Draft run completed as:

- input lane `Form direct`;
- mapped result `not-required`;
- validation `run-valid`;
- 0 warnings;
- parity fingerprint prefix `f21638952df9`; and
- exact Draft PDF 10 pages with Download available.

The retained Backend evidence proves the adapted API lane reaches the full same
canonical content fingerprint. The two generation instances intentionally have
different input and PDF hashes, so the UI makes no byte-parity claim.

## Explicitly Not Changed

- no browser persistence of Form/API test sessions;
- no mapped-value hydration from adapted API responses;
- no arbitrary live-draft compiler or durable Draft repository;
- no SQLite optimization or new 240-page result;
- no complete Module 2 or 200-page run;
- no multi-user authorization, hosted provider, deployment, retention, or cost
  decision; and
- no production activation.

## Next Phase

`PDF-EXPORT-REALDOC-E.6.1` is now accepted in
`docs/REALDOC_CROSS_REPO_LIFECYCLE.md`. Editor preserves the Backend durability
fact without receiving canonical values. E.6.2 durable Backend
operation/artifact restart and E.6.3 strict Editor reconnect, failure,
cancellation, and retry acceptance are now complete for local development.
Production remains NO-GO.
