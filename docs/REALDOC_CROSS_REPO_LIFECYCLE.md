# REALDOC Cross-Repo Lifecycle

Status: `PDF-EXPORT-REALDOC-E.6.1` accepted for local Editor contract
projection. `E.6.2` and `E.6.3` remain pending. Production remains NO-GO.

## Editor Boundary

Editor remains a temporary Form/JSON pre-test client. It does not own the
protected canonical record, SQLite database, mapping execution, Document
Instance allocation, operation lifecycle, renderer, or artifact bytes.

E.6.1 changes one truthful public fact: the sanitized Published Preview
admission receipt now preserves Backend `durablePersistence` as a boolean.
Memory-backed admissions remain `false`; the optional durable Backend
repository reports `true`.

## Sanitized Receipt

The parser still requires the complete exact Backend receipt shape and rejects
unknown keys. It accepts either boolean durability value and returns only:

- lane, scope, exact Structure and Document Instance identity;
- input, canonical-input, canonical-content, and receipt fingerprints;
- content-free diagnostics and execution checkpoints; and
- content exposure, raw-payload retention, durability, and production facts.

Canonical business values and raw JSON do not cross this boundary. A durable
receipt does not authorize the browser to cache, reconstruct, or expose them.

## Accepted Evidence

- existing memory-backed Preview receipts still parse with
  `durablePersistence: false`;
- SQLite-backed receipts parse with `durablePersistence: true`;
- non-boolean durability and any leaked canonical value remain rejected;
- Draft and Published preview lifecycle tests retain their prior behavior; and
- Editor type-check and targeted contract/UI tests pass.

The independent-process replay itself is Backend evidence. Editor E.6.1 only
accepts the content-free contract needed to project its result honestly.

## Remaining E.6

`E.6.2` must make the Backend operation, lifecycle, artifact metadata, and
verified bytes restartable. Editor must not claim a recoverable Preview merely
because the admission receipt is durable.

`E.6.3` must then prove browser reload/reconnect, scoped status recovery,
uncertain cancellation and retry reconciliation, stale-result rejection,
diagnostic navigation, and verified download through that durable runtime.

## Explicitly Not Changed

- no browser persistence of Form values, JSON text, receipt, or operation state;
- no automatic reconnect or resume UI acceptance;
- no browser mapping, canonical resolution, pagination, rendering, or storage;
- no SQLite scheduler optimization or new 240-page measurement;
- no REALDOC-F Module 2 expansion or REALDOC-G 200-page run; and
- no default route, hosted provider, deployment, or production activation.

## Next Phase

`PDF-EXPORT-REALDOC-E.6.2` owns durable Backend operation/artifact restart.
Editor reconnect acceptance remains `E.6.3`. Production remains NO-GO.
