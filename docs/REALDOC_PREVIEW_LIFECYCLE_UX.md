# REALDOC Preview Lifecycle UX

Status: `PDF-EXPORT-REALDOC-E.5.8` accepted for local Editor pre-test.
Production remains NO-GO.

## Lifecycle Model

Draft and Published Preview share one exact lifecycle projection while keeping
target-specific context, admission, operation, and artifact identity.

The surface distinguishes:

- context checking, ready, and unavailable;
- mapping/validation admission;
- PDF operation request, pending, processing, and finalizing;
- cancellation request and cancelled terminal state;
- status, admission, operation, cancellation, and download failures;
- completed artifact and stale result; and
- retry of the exact failed stage versus a new terminal generation intent.

Target switching is disabled while an operation is active. Input edits may
mark the result stale, but they do not relabel or reuse the old artifact.

## Recovery Controls

The status bar exposes Cancel only for accepted, pending, or processing work.
Finalizing and cancel-requested work remain visible without presenting an
invalid second cancel command.

Retry behavior is stage-specific:

- admission and request uncertainty reuse their original idempotency keys;
- status retry reads the same operation;
- cancel retry reuses the same cancel key;
- download retry reads the same completed artifact; and
- terminal cancel/failure starts a new generation intent.

Raw transport error codes are not shown as user-facing messages. The operation
and admitted instance pins are checked before a status can replace visible
truth.

## Result Diagnostics

The mapped receipt exposes only content-free issues and warnings. Editor shows
one result diagnostic at a time with previous/next controls, position, severity,
code, path, and message. Canonical business values and raw payload text do not
return through this surface.

## Large JSON Interaction

The 1 MiB input limit remains unchanged. Payloads at or above 256 KiB default
to a bounded summary with byte length and source filename. The full JSON is not
rendered into a controlled textarea until Edit JSON is selected.

Large editing uses an uncontrolled textarea. Apply performs one state update,
syntax check, and diagnostic recomputation; Cancel discards the edit. Small
payloads retain the immediate controlled editor.

## Local QA

Development route `/__qa/realdoc-e5-8-preview-lifecycle` reuses the trusted
Draft/Published 69C contexts. Browser QA imported the 749,929-byte payload and
confirmed the default 732 KiB summary contains no live JSON textarea.

The run accepted mapping `executed`, validation `run-valid`, 0 errors, 3
warnings, diagnostic navigation, pending cancellation, retry after cancellation,
Backend-unavailable failure, recovery after Backend restart, and a completed
10-page exact Draft PDF. Direct artifact verification returned
`application/pdf`, 1,417,544 bytes, and SHA-256
`e2f2b3f5e6dd9cc28ecabb31032bb6caa0cdae8b1580baf2110f9dc9079f7713`.

Desktop 1280 x 720 and mobile 390 x 844 screenshots show no incoherent overlap
or horizontal page overflow. Browser warning/error logs are empty. The browser
harness did not expose a native download event for the generated Blob anchor;
the accepted download signal is the completed UI state plus verified Backend
artifact response.

## Explicitly Not Changed

- Form data remains local-only in E.5.8 and is not admitted by that phase;
- no Form admission or API parity evidence in E.5.8 itself;
- no durable test-input, Draft snapshot, or artifact session state;
- no browser mapping, resolution, pagination, or rendering;
- no arbitrary live Editor draft compiler;
- no SQLite optimization, Module 2 scale, or full 200-page run; and
- no production route, provider, deployment, retention, or activation.

## Risks

The large payload remains one in-memory string and is parsed as one bounded
operation on selection or Apply. The local real-document renderer still runs
in the Backend listener process; its 10-second dispatch window is QA harness
behavior, not a production worker promise.

Failure and retry are accepted for the active local session. E.6.1 makes the
protected Backend admission optionally durable, E.6.2 accepts durable
operation/artifact restart, and E.6.3 now accepts strict content-free Editor
reconnect and stale-result rejection.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.9` is now accepted in
`docs/REALDOC_FORM_API_PARITY.md`. Dynamic Form candidates use direct Backend
admission and converge with adapted API input on canonical content while
retaining separate instance identities. E.6.1 durable admission and E.6.2
durable Backend lifecycle are accepted in
`docs/REALDOC_CROSS_REPO_LIFECYCLE.md`; complete E.6 is now accepted for local
development. Production remains NO-GO.
