# REALDOC Published Preview

Status: `PDF-EXPORT-REALDOC-E.5.6` accepted for local Editor pre-test.
Production remains NO-GO.

## Trusted Context

Preview loads one exact value-free context for the active authoring document and
revision. The parser fails closed unless the projection, mapping profiles,
Structure owner, target data contract, asset registry, limits, and privacy
contracts are exact. Normal documents without this binding continue to show
Preview unavailable.

The strict admission parser validates the complete E.3 content-free receipt and
then returns only the public subset needed by the Editor. Unexpected fields,
including hidden canonical business data, are rejected rather than retained in
UI state.

## Form Canonical Candidate

Form mode remains generated from the active Core projection. E.5.6 originally
exposed a memory-only `draft-not-validated` representation without admission.
E.5.9 replaces that UI projection with a read-only
`editor-form-canonical-candidate` that can be admitted directly only after it is
ready and still requires Backend validation.

Image fields become canonical asset references only after exact digest and
metadata match against the admitted asset registry. Browser-local file and
selection identities remain outside the candidate.

## Imported JSON And Mapped Result

JSON mode keeps the existing 1 MiB preparation checks and exact profile
selection. `Generate PDF` is enabled only when JSON and profile are
`ready-for-admission`.

Generation performs:

```text
E.3 admission -> E.4 export request -> status polling -> exact PDF/download
```

The right surface reports input lane, mapping, runtime validation, warning
count, canonical-content fingerprint prefix, page count, and artifact state.
It never displays or stores
the mapped canonical values. Editing the JSON or changing profile/context marks
the prior result `Stale result`, hides its PDF, and disables its download truth.

## Local QA

Development route `/__qa/realdoc-e5-6-published-preview` binds the real 69C
local context. Browser QA imported the 749,929-byte adapted JSON, selected the
exact 69C profile, and completed a 10-page exact PDF through the local proxy.

At 1280 x 720 and 390 x 844:

- the Form/JSON and result surfaces remain usable;
- the page has no horizontal overflow;
- mapped result facts remain readable;
- stale input removes the old iframe and Download action; and
- browser console warning/error count is zero.

The QA route is development-only. Production builds must exclude it and all 69C
QA-specific strings.

## Explicitly Not Changed

- no imported values written into Structure authoring state;
- no browser mapping, resolving, pagination, or rendering;
- no Form draft admission or mapped-value hydration into Form controls;
- no durable Draft Preview repository or arbitrary live-draft compiler;
- no refresh persistence for test values;
- no user authorization or collaboration claim; and
- no production activation.

## Risks

- Editing very large JSON text remains a performance-sensitive surface even
  inside the accepted 1 MiB bound.
- Embedded PDF display depends on browser PDF capability; download remains the
  exact artifact fallback.
- The full 200-page document remains untested until REALDOC-G.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.7` accepts Draft Preview with a separate immutable
draft identity and admission. E.5.8 now accepts complete lifecycle and bounded
large-input UX. E.5.9 now accepts Form/API canonical-content parity. E.6 next
owns cross-repo restart/failure acceptance. Production remains NO-GO.
