# REALDOC Draft Preview

Status: `PDF-EXPORT-REALDOC-E.5.7` accepted for local Editor pre-test.
Production remains NO-GO.

## Target Selection

Preview exposes a segmented Draft/Published target selector. Draft is selected
by default when its trusted context is available; otherwise Editor may fall
back to an available Published context. A normal document with neither trusted
context remains honestly unavailable.

Draft and Published can share one compatible Core test-input projection, so
temporary Form or JSON input may stay visible when the target changes. The
target is nevertheless part of generation identity. Changing it clears any
prior receipt, operation, iframe, page count, and download truth.

## Strict Draft Context

Editor accepts only the complete Backend Draft context with an exact immutable
Core snapshot, authoring revision, projection, mapping profiles, asset
template, compatibility-bridge facts, and content-free contracts. Unknown or
drifted fields fail closed.

Draft admission sends the snapshot id/fingerprint, exact mapping profile, and
temporary adapted JSON to the separate Draft route. It does not send a
Published Structure identity. The returned wrapper must state
`publishedApiParity: false`, expose no canonical business values, and pin the
same immutable snapshot.

## Exact Preview Flow

Both targets use the same result surface and exact PDF lifecycle after their
own admission boundary:

```text
select target and temporary input
  -> target-specific Backend admission
  -> shared validation and artifact lifecycle
  -> content-free result facts
  -> exact PDF / verified download
```

The UI labels the result `Draft Preview` or `Published Preview`. Draft never
uses the Published label and is never shown as API-parity evidence.

## Local QA

Development route `/__qa/realdoc-e5-7-draft-preview` mounts trusted Draft and
Published contexts for the same 69C authoring pin. Browser QA imported the
749,929-byte JSON, selected the exact 69C mapping profile, and completed a
Draft Preview with mapping `executed`, validation `run-valid`, 3 warnings, and
an exact 10-page PDF.

At 1280 x 720 and 390 x 844 there is no horizontal page overflow. Switching
Draft to Published and back removes the old artifact while preserving the
compatible 732 KiB temporary JSON and selected profile. Browser warning/error
count is zero.

The QA route is development-only. Production builds must exclude E.5.7 and 69C
QA route strings.

## Explicitly Not Changed

- no automatic compile of arbitrary live Editor drafts into a generation
  bundle;
- no durable Draft snapshot, test-input, or artifact session state;
- no Form draft admission or mapped-value hydration;
- no browser mapping, resolving, pagination, or rendering;
- no claim that Draft and Published artifacts are byte-identical;
- no complete 200-page export, which remains `PDF-EXPORT-REALDOC-G`; and
- no production route, provider, authorization, deployment, or activation.

## Risks

The current local Draft context comes from a trusted 69C registry. It proves the
target identity, strict parser, separate admission, and shared lifecycle, but
not generic authoring-package compilation.

E.5.8 now bounds the normal 732 KiB JSON DOM and accepts local lifecycle
recovery. Complete 200-page scale still belongs to REALDOC-G.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.8` now accepts loading, failure, cancel, retry,
diagnostic navigation, bounded large-input interaction, and download lifecycle
UX. E.5.9 next owns Form/API parity evidence. Production remains NO-GO.
