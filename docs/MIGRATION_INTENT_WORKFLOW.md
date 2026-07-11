# Document Migration Intent Workflow

Status: Phase 261 migration workflow complete; Phase 262 target mode is partial.

## Outcome

The editor exposes an explicit `Upgrade` command only for a fresh backend-owned
package 2/document 3 working set when backend capability reports migration
persistence as available. Package reads never trigger migration automatically.

## Execution Flow

```text
user Upgrade intent
  -> capture document id and base revision
  -> POST revisioned migration request
  -> applied, stale, or rejected result
  -> applied/replayed target document read
  -> request/result/read identity and revision verification
  -> core adapter package 3/document 4 parse
  -> v4 partial-operation working-set replacement
```

Mutation commands are disabled while migration is pending. An applied response
does not replace runtime state by itself; the target revision must be read back
and accepted by the isolated core v4 projection. The editor enters `partial`
mode because only `node.delete` and `node.reorder` are enabled.

If transport or target-read verification fails without a definitive stale or
rejected result, retry reuses the same request id and base revision. This lets
the backend return its retained idempotent receipt instead of attempting a
second migration.

## Result States

| Result | Editor behavior |
|---|---|
| applied/new | verify target read and open partial mode |
| applied/replayed | verify retained target read and open partial mode |
| stale | keep current state and report newer revision |
| rejected | keep current state and surface backend issue |
| invalid/mismatched read | keep current state and report verification failure |
| network failure | keep current state and report backend unavailable |

## PASS

- Migration requires an explicit user command.
- Request id, document id, base revision, target revision, and target version
  are verified before runtime replacement.
- Applied and replayed outcomes both require a fresh target read.
- V4 opens with block-subtree delete and same-parent reorder enabled; text,
  field, duplicate, live layout, and exact layout remain disabled.

## FAIL / BLOCKER

- V4 mutation, measured layout, exact rendering, and export remain unavailable.
- Production authorization and durable database transactions remain backend
  deployment concerns.

## RISK

- The current in-memory backend loses migration receipts on restart.
- A successful backend write followed by a failed target read leaves the editor
  on v3 until refresh; it does not roll back the accepted migration.

## UNKNOWN

- Final product copy and permission model for migration eligibility.
- Whether production migration needs a dry-run summary before confirmation.

## Intentionally Not Changed

- core migration semantics or target package shape;
- backend route, persistence, snapshot, or idempotency behavior;
- active v3 mutation behavior;
- v4 operations, pagination, exact renderer, export, or asset-byte resolution.

## Next Recommended Direction

Lock duplicate ID allocation and shared registry reference rules before
enabling `node.duplicate`.
