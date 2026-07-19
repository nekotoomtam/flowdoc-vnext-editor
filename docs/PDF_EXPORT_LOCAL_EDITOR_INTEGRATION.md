# PDF Export Local Editor Integration

Status: `PDF-EXPORT-LOCAL-F` Editor eligibility, request, redacted status,
cancellation, verified download, retry, and stale-revision integration accepted
through a development-only same-origin proxy. `PDF-EXPORT-LOCAL-G` now accepts
the bounded canonical local-readiness audit. Product-document eligibility and
every production binding remain closed.

## Runtime Boundary

The Editor sends PDF traffic only to `/api/pdf-export-local`. In the explicit
local development profile, Vite proxies that prefix to the separate Backend
PDF listener on `127.0.0.1:4012`. The browser never receives or sends the local
bearer token. The proxy overwrites the Authorization header from the Backend
`.env.local` value inside the Vite Node process.

The proxy exists only when all of these values are exact:

- Vite command is `serve`;
- `FLOWDOC_PDF_LOCAL_RUNTIME_PROFILE=local-integration`;
- `FLOWDOC_PDF_LOCAL_INTEGRATION=1`;
- `FLOWDOC_PDF_LOCAL_HTTP_HOST=127.0.0.1`;
- the port is bounded; and
- the local bearer token satisfies the Backend length/whitespace contract.

Build mode returns no proxy profile even when those variables are present.
The credential is not a `VITE_*` variable and is not compiled into browser
assets.

## Editor Workflow

Eligibility is checked against the exact current Core working-set
`documentId` and `documentRevision`. Only an `eligible` response for the same
pin opens request intent. A stale response, unsupported document, non-fresh
working set, changed revision, mismatched operation response, or invalid
public contract closes the command.

The browser request body contains exactly `documentId` and
`documentRevision`. Caller request and cancellation idempotency keys are
created once per UI intent and retained across transport retries. Tenant,
principal, renderer, measured contract, resource, provider, and credential
fields are never accepted from Editor state.

Accepted operations are polled at a bounded one-second cadence. The Editor
accepts only the redacted public status fields and ignores no additional
fields: an expanded response fails the exact parser. Active operations expose
cancel intent, completed operations expose download, and failed/cancelled
operations expose a new request intent. Download requires a successful
`application/pdf` response and uses the fixed filename `flowdoc-export.pdf`.

Changing the current document revision clears the operation, request key,
cancel key, and prior eligibility before another check. An old async response
cannot update the new document pin.

## Current Eligibility

The accepted Backend resolver still supports only the retained Phase T
canonical document revision. The Editor's normal product document is therefore
shown as `PDF unavailable`; it is not replaced by the canonical evidence
fixture and no configuration can override the working-set pin.

The transport and state integration cover an eligible canonical response, but
the current product read route does not expose that canonical source as an
Editor working set. Product-document export remains closed until trusted
measurement and digest-bound resource resolution exist for the exact product
revision.

## Local Commands

Prepare and run the Backend providers, HTTP process, and worker from the
Backend repository:

```text
npm run pdf-export-local:env
npm run pdf-export-local:up
npm run pdf-export-local:migrate
npm run pdf-export-local:http
npm run pdf-export-local:worker
```

Run the Editor in a separate terminal:

```text
npm run dev:pdf-export-local
```

Normal `npm run dev` starts without the PDF proxy. Neither command changes the
production build or default Backend application server.

## Evidence

- `src/editor/pdfExport/localPdfExportContracts.ts` owns exact public parsing
  and pin checks.
- `src/editor/pdfExport/localPdfExportTransport.ts` owns same-origin HTTP
  intent and accepts no browser credential.
- `src/app/useLocalPdfExport.ts` owns eligibility, idempotency, polling,
  cancellation, download, retry, and stale async-result handling.
- `src/components/shell/EditorToolbar.tsx` owns compact command/status
  presentation.
- `vite.config.ts` owns the fail-closed development proxy.
- `src/tests/localPdfExport.test.ts` proves contracts, routes, browser headers,
  control states, proxy gating, and server-side credential injection.
- Backend eligibility and actual-provider evidence lives in
  `../flowdoc-vnext-backend/src/tests/pdfExportLocalEligibilityHttpHandler.test.ts`
  and `pdfExportLocalProviders.integration.test.ts`.

## LOCAL-G Follow-Up

The Backend actual-provider gate now proves the Editor-facing public contract
across two operating-system processes. The first process admits, renders,
reports redacted completion, and downloads the exact canonical PDF. The second
process replays the same caller key, reports the identical public status and
download bytes, and invokes no worker work. The public status key set is checked
exactly, so provider, tenant, principal, credential, contract, and resource
details cannot expand into the Editor response unnoticed.

Actual HTTP cancellation before worker handoff reports cancelled state, returns
no PDF, and creates no object. The complete LOCAL-G fault and measured resource
record is retained in
`../flowdoc-vnext-backend/docs/PDF_EXPORT_LOCAL_READINESS_AUDIT.md`.

## RISK

- Browser lifecycle tests currently exercise the default ineligible product
  lane; the eligible canonical sequence is contract/state evidence because the
  canonical source is not a product Editor working set.
- Polling is intentionally simple and local. Visibility-aware scheduling and
  long-running reconnect policy remain future product-lane ergonomics work.
- The local bearer is development-only and is not a production identity or
  tenancy model.

## UNKNOWN

- Published Structure generation admission, runtime mapping, and resource
  eligibility for the future DocGen pre-test lane.
- Production identity, deployment, provider, SLO, capacity, retention,
  backup, TLS, rate-limit, monitoring, cost, and rollout decisions.

## Intentionally Not Changed

- Core document, layout, renderer handoff, receipt, or completion contracts.
- Backend default application server or CORS policy.
- Renderer, worker, PostgreSQL, or S3-compatible provider implementation in
  the Editor.
- Canonical fixture substitution for the current product document.
- Production proxy, credential, provider, renderer, deployment, or activation.

LOCAL-A through LOCAL-G local qualification is complete. REALDOC-E.0 locks the
next product path as Structure authoring plus API-driven DocGen, not current
Editor-document eligibility. REALDOC-E.1 now accepts the pure Core input plan
for direct canonical snapshots or an adapted-payload descriptor and mapping
profile, without changing this Editor transport. Test-data import must remain
separate from authored Structure truth and use the same Backend
mapping/generation path as an external API-shaped caller. The current controls
remain reusable lifecycle evidence only. See
`docs/REALDOC_DOCGEN_PRETEST_BOUNDARY.md`. Production remains NO-GO.

REALDOC-E.2 now proves exact payload/mapper execution and direct/adapted
canonical parity inside Core. It still does not change this Editor transport,
add test-data selection, run mapping in the browser, or expose canonical
business values as lifecycle state. Backend admission remains the next gate.

REALDOC-E.3 now accepts the separate optional Backend
`POST /docgen-local/admissions` boundary with trusted Structure, mapper, and
asset-byte admission plus a protected canonical record. This Editor transport
is intentionally unchanged and still cannot call that route. E.4 binds the
record to the artifact lifecycle; E.5.1 through E.5.9 then add the pre-test
surface through a same-origin development transport without exposing a local
credential or storing test values in authored Structure state.

REALDOC-E.4 now completes that Backend binding. One protected 69C generation
reuses the existing PDF operation, worker, cancellation, persistence, status,
and verified-download lifecycle. This Editor transport remains intentionally
unchanged; later E.5 phases own the separate test-data selection, admission
diagnostics, stale gates, and artifact controls for the DocGen pre-test flow.

REALDOC-E.5.0 locks that product surface in
`docs/REALDOC_DOCUMENT_WORKSPACE_PRODUCT_CONTRACT.md`. REALDOC-E.5.1 now adds
the bounded content-free local Library transport and first Library route/view.
It opens the existing Design runtime by URL, keeps Preview disabled, and makes
no per-user authorization claim. REALDOC-E.5.2 now adds the shared workspace
header and URL-backed Design/Preview tabs while preserving the Design runtime.
The Preview route reports unavailable and does not call this PDF transport.
E.5.4 now accepts temporary Editor Form state over the E.5.3 Core projection.
E.5.5 next adds JSON/mapping state without relabeling this PDF transport as
DocGen admission.
