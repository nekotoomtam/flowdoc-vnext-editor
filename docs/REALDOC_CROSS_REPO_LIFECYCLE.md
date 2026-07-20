# REALDOC Cross-Repo Lifecycle

Status: `PDF-EXPORT-REALDOC-E.6.3` accepted for local development. The complete
REALDOC-E.6 lifecycle lane is accepted. Production remains NO-GO.

## Decision

Editor can reconnect a known exact Preview attempt after a browser reload and
ask the optional durable Backend runtime to resume that operation explicitly.
It does not make Form state, JSON payload text, canonical business data, or PDF
bytes browser-durable.

The reconnect path preserves the existing ownership split:

- Core owns the exact content fingerprint and generation identity contracts;
- Backend owns protected admission, Document Instance identity, operation
  lifecycle, persistence, rendering, and artifact truth; and
- Editor owns only the temporary input experience and content-free reconnect
  projection.

## Session Reconnect Record

After Backend returns a durable sanitized admission receipt, Editor stores one
strict versioned record in `sessionStorage`. It contains only:

- Draft or Published target plus exact authoring/context/projection pins;
- SHA-256 input-content identity;
- admission, export, and optional cancel idempotency keys;
- the sanitized durable receipt and optional known operation id; and
- explicit content-free and local-only contract facts.

A separate session marker remembers which target owns the latest reconnect
record so reload returns directly to Draft or Published as appropriate. Both
records fail closed on unknown keys, context drift, mapping-profile drift,
invalid fingerprints, or a non-durable receipt. Blocked or unavailable browser
storage degrades to a normal memory-only session.

Form values, collections, JSON payload text, canonical business values, and
artifact bytes are never written to browser storage.

## Exact Resume

On reload Editor validates the record against the newly loaded strict context,
restores the sanitized receipt and diagnostics, then replays the exact PDF
request with the retained export idempotency key and Document Instance pin.
Backend returns the same scoped operation and schedules only that known
identity. If request replay is temporarily unavailable and an operation id is
known, Editor may read that exact status; it does not discover arbitrary work.

The reconnect activity is projected as `Reconnecting exact preview`. Normal
polling, terminal status, retry, and download behavior continue through the
existing lifecycle model.

## Stale Result Rejection

Input identity hashes the actual Form canonical candidate or JSON payload plus
its exact mapping-profile fingerprint. It does not use the resettable UI
revision counter.

If input content is missing or changed after reload, the recovered operation
and diagnostics remain visible but the result is marked `Stale result`.
Artifact embedding and download stay unavailable until the user generates a
new exact result from the current input. This is expected for imported JSON,
which intentionally remains memory-only.

## Cancellation Reconciliation

Editor allocates and persists the cancel idempotency key before sending the
cancel request. If the browser or Backend response is interrupted, reload and
retry reuse the same key. Backend can therefore return the retained cancelled
state or an exact idempotent replay without creating a second cancellation.

## Accepted Evidence

- strict reconnect parsing rejects context, profile, durability, and unknown
  key drift;
- exact input fingerprints change when Form/JSON content changes and contain no
  source text;
- the latest Preview target is restored after reload;
- the 749,929-byte 69C JSON input maps and validates with three content-free
  warnings, completes as a 10-page, 1,417,544-byte artifact, and downloads from
  the UI;
- reload returns directly to Published, displays reconnect activity, restores
  diagnostics and page count, then rejects the result as stale because JSON
  was not retained; and
- the Preview workspace remains coherent at desktop size and at 390 x 844.

Backend evidence separately proves pending-operation restart, exact request
replay, status recovery, uncertain cancel reconciliation, scoped concealment,
and verified artifact download across four durable repository opens.

## Explicitly Not Changed

- no browser persistence of Form values, JSON text, canonical business data,
  or PDF bytes;
- no automatic Backend startup scan or default worker mount;
- no hosted provider, multi-user authorization policy, deployment, retention,
  SLO, or cost decision;
- no SQLite scheduler optimization or new 240-page measurement;
- no REALDOC-F Module 2 expansion or REALDOC-G 200-page run; and
- no production activation.

## Next Decision

REALDOC-E.6 is complete for the optional local-development profile. SQLite
scale optimization, REALDOC-F, and REALDOC-G remain deferred until explicitly
resumed. Production remains NO-GO.
