# REALDOC Local Document Library

Status: `PDF-EXPORT-REALDOC-E.5.1` accepted for local development. Production
remains NO-GO.

## Scope

The Editor now starts at `/documents` and reads one bounded metadata page from
the local Backend. A Library item represents a Structure authoring project,
not a generated Document Instance or PDF artifact. Opening an item navigates to
`/documents/:documentId/design` and loads the existing Design runtime.

The first route set is:

| Route | E.5.1 state |
| --- | --- |
| `/documents` | Active local Library |
| `/documents/:documentId/design` | Active existing Design runtime |
| `/documents/:documentId/preview` | Deferred to E.5.2 and later |

## Backend Contract

`GET /documents?limit=<1..100>&cursor=<opaque>` returns contract version 1,
newest `updatedAt` first with `documentId` as the deterministic tie breaker.
The default limit is 24. The cursor carries only the last update time and
document identity and is validated before repository access.

Each item contains only authoring identity, title, revision, update time,
draft/published availability, derived Design/Preview capabilities, and an
explicit placeholder-thumbnail state. The response excludes `packageValue`,
field registries, test payloads, canonical snapshots, generated values,
measured contracts, PDF bytes, and artifact records.

The scope is explicitly:

```text
kind: local-workspace
workspaceId: local-development
authorization: not-configured
```

It is local evidence and does not claim per-user authorization or tenancy.

## Editor States

The Library implements loading, retryable failure, empty, ready, refresh, and
load-more states. Cards use Backend capability facts:

- Design is available and opens the existing Editor shell;
- legacy package V2/document V3 records report `migration-required`;
- Published Structure state remains `unavailable` rather than fabricated;
- Preview remains disabled with either `migration-required` or
  `preview-not-implemented`; and
- thumbnails remain honest placeholders until a retained thumbnail contract
  is accepted.

The existing Editor header has one Back-to-Library command. E.5.1 does not add
the shared Design/Preview tab strip or Preview state.

## Verification

- Backend list ordering, pagination, invalid limit/cursor, content exclusion,
  and HTTP behavior are covered by automated tests.
- Editor transport strictly rejects unknown/content-bearing item keys.
- Editor routing, type checking, tests, and production build pass.
- Browser review passes at 1440 x 900 and 390 x 844 without Library overflow;
  opening Design and returning to `/documents` both preserve URL identity.

## Explicitly Not Changed

- no generated Form or JSON test-data state;
- no Preview route/view or Draft/Published Preview execution;
- no Structure publish workflow or Published Structure repository;
- no authentication, authorization, tenant isolation, sharing, or folders;
- no PDF operation, worker, renderer, artifact, or provider change; and
- no production deployment or activation.

## Next Phase

Follow-up `PDF-EXPORT-REALDOC-E.5.2` now accepts the shared workspace header and
URL-backed Design/Preview tabs while keeping Preview execution inactive. E.5.3
accepts the Core UI-neutral test-input projection, and E.5.4 accepts temporary
Editor Form state. E.5.5 next adds JSON/mapping state. Production remains NO-GO.
