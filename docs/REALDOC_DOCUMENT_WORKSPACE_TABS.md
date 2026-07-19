# REALDOC Document Workspace Tabs

Status: `PDF-EXPORT-REALDOC-E.5.2` accepted for local development. Production
remains NO-GO.

## Scope

The document workspace now has one shared header with Back to Library, document
identity, URL-backed Design/Preview tabs, and current readiness facts. The
accepted workspace routes are:

| Route | State |
| --- | --- |
| `/documents/:documentId/design` | Existing Structure Design runtime |
| `/documents/:documentId/preview` | Preview boundary and honest unavailable state |

An omitted or unknown workspace view redirects to Design. The route still uses
the authoring `documentId`; it does not create or imply a generation-instance,
Published Structure Version, or artifact identity.

## State Retention

Design and Preview are view state inside one document-keyed `EditorApp` runtime.
Changing the `:view` URL hides the Design surface without unmounting it. Local
selection, history, working set, mutation state, migration state, and current
document load therefore survive a tab switch. Changing `documentId` remounts
the runtime so state cannot leak between authoring projects.

The selected tab is derived from the URL. Direct navigation, reload, browser
back/forward, the tab controls, and Return to Design converge on the same route
contract.

## Preview Boundary

E.5.2 activates the Preview route, not Preview execution. The view uses the
loaded document identity and reports one of two content-free reasons:

- legacy package V2/document V3: `Migration required`;
- migrated document without the later input/runtime phases: Preview unavailable.

No Form, JSON payload, mapping profile, canonical snapshot, generated page,
operation, artifact, or PDF byte is created. The Library capability response
and direct Preview card action remain unavailable until the required document
and Preview contracts are accepted.

## Verification

- pure route tests cover accepted views, invalid views, and encoded document ids;
- contract guards retain one document-keyed runtime across Design/Preview URLs;
- automated Editor type checking, tests, and production build pass;
- desktop and mobile browser review confirms no workspace-header overflow;
- a selected Design node remains selected after Preview and Return to Design;
  and
- the final browser console contains no errors.

## Explicitly Not Changed

- no Backend route, repository, list response, or document response change;
- no Core test-input projection or scalar constraint vocabulary;
- no Form/JSON test-data state or persistence;
- no Published or Draft Preview admission and no artifact lifecycle call;
- no Structure publish workflow;
- no authentication, authorization, tenancy, sharing, or folders; and
- no production provider, deployment, cost, or activation.

## Next Phase

`PDF-EXPORT-REALDOC-E.5.4` now accepts temporary Editor Form state over the Core
projection. E.5.5 next adds JSON/mapping state; this E.5.2 workspace still
performs no Preview execution.
Production remains NO-GO.
