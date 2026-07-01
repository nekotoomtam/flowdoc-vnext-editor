# Core Read Binding Working Set

Status: accepted active contract for the read-only core binding phase.

## Purpose

This document defines the working set contract used when the product editor reads
from `@flowdoc/vnext-core`.

The current phase is read-only. It may bind core-derived envelope data, read
model data, capability mirrors, diagnostics, and render projection summaries into
the frontend runtime. It must not add document mutation, WYSIWYG, persistence, or
backend behavior.

## Working Set Invariant

`FrontendCoreWorkingSet` is the only runtime-owned view of core-derived read
data inside the editor.

It is not the canonical package.

It is not a backend response object.

It is not React component state.

It is a bounded frontend runtime projection created from adapter-safe core data.

The working set must keep these parts revision-aligned:

```txt
envelope.documentRevision
envelope.documentId
readModel.sourceRevision
capabilities.sourceRevision
renderProjection.sourceRevision
renderProjection.documentId
diagnostics source
```

Any core-derived result that cannot prove it belongs to the active document
and revision must be blocked as stale.

## Owned Shape

The working set owns these frontend-safe values:

```txt
document summary
core snapshot envelope
normalized read model
command capability mirror
diagnostics summary
render projection summary
```

The working set must not own:

```txt
canonical package object
core source modules
React component state
DOM state
scroll state
selection state
draft buffer
mutation queue
backend request/session state
artifact bytes
```

## Envelope

The envelope records where the snapshot came from and which revision it
represents.

Required envelope facts:

```txt
documentId
documentRevision
documentVersion
packageVersion
schemaVersion
snapshotRevision
coreRevision
sourceKind
status
createdAt
capabilities
diagnostics
layoutGeneration
measurementProfileId
failures
```

Allowed `sourceKind` values:

```txt
api
fixture
job-result
local-draft
mutation-result
```

The frontend must treat `sourceKind` as provenance, not permission to bypass
guards.

## Read Result Envelope

The adapter read path uses a request/result envelope before a working set is
created.

Required request facts:

```txt
documentId
baseRevision
requestedAt
sourceKind
requireDiagnostics
requireRenderProjection
```

Required result envelope facts:

```txt
documentId
baseRevision
documentRevision
snapshotRevision
coreRevision
sourceKind
status
receivedAt
failures
```

`status: blocked` means the frontend must not create a working set from that
result. `status: partial` may bind a working set only when failures are
represented explicitly.

## Failure Vocabulary

Read binding failures must use this shared vocabulary:

```txt
core-unavailable
invalid-envelope
document-mismatch
revision-stale
missing-diagnostics
missing-render-projection
blocked-by-core
unknown-core-result
```

Do not introduce ad hoc failure strings in adapter, factory, or apply paths.

## Read Model

The read model is normalized lookup-first data derived from adapter-safe seed
data.

Required read model facts:

```txt
revision
sourceRevision
nodeById
parentById
childrenById
sectionById
zoneById
nodeOrder
textBlockIds
tableIds
visibleNodeIds
dirtyNodeIds
changedSubtreeIds
renderableNodeIds
```

Interaction paths should read these indexes and selectors. They must not walk a
recursive package tree as active runtime behavior.

## Capabilities

The capability mirror is derived from the read model and must use the same source
revision.

Capabilities are read-only command readiness facts. They do not execute
commands, mutate the document, or grant backend/runtime permission by themselves.

## Render Projection

The render projection stored in the working set is a summary, not final layout
truth.

Allowed summary facts:

```txt
kind
documentId
sourceRevision
projectionId
pageCount
blockCount
nodeToBlockIds
nodeToFragmentIds
layoutGeneration
stale
```

Blocked in this phase:

```txt
exact page break ownership
text wrapping truth
table row height truth
export readiness claims
PDF/DOCX artifact generation
```

## Revision Guards

All core-derived apply paths must compare the result against the active envelope.

Required checks:

```txt
baseRevision matches envelope.documentRevision when present
documentId matches envelope.documentId
sourceRevision matches envelope.documentRevision
stale cache flags are rejected
stale envelopes are not treated as fresh
older async results cannot overwrite newer working set data
```

Blocked apply behavior:

```txt
apply result with old baseRevision
apply result with different documentId
apply result with old sourceRevision
apply result marked stale
apply result into stale active envelope without explicit recovery path
silently mutate existing working set objects
```

## Core Import Boundary

All direct imports from `@flowdoc/vnext-core` must stay inside:

```txt
src/core/
```

Blocked:

```txt
src/app/** imports @flowdoc/vnext-core
src/components/** imports @flowdoc/vnext-core
src/editor/** imports @flowdoc/vnext-core
src/** imports ../flowdoc-vnext-core/src/**
```

The frontend must use adapter-safe shapes from `src/core/coreAdapter.ts` and
`src/core/coreTypes.ts`.

## Current Implementation Files

```txt
src/editor/coreBinding/coreEnvelope.ts
src/editor/coreBinding/readModel.ts
src/editor/coreBinding/capabilityMirror.ts
src/editor/coreBinding/renderProjectionSummary.ts
src/editor/coreBinding/revisionGuards.ts
src/editor/coreBinding/workingSetFactory.ts
src/editor/coreBinding/workingSetTypes.ts
src/editor/runtime/runtimeApplyGate.ts
src/editor/runtime/runtimeCoreBinding.ts
src/editor/runtime/runtimeDiagnosticsResults.ts
src/editor/runtime/runtimeRenderResults.ts
src/editor/runtime/runtimeJobResults.ts
```

## Phase Scope

Allowed now:

```txt
bind read-only core snapshots into FrontendCoreWorkingSet
bind adapter request/result envelopes before working set creation
derive normalized read model
derive command capability mirror
derive render projection summary
represent blocked and partial read results with shared failures
apply fresh diagnostics/render/job results through revision gates
block stale or document-mismatched results
test source import boundaries
```

Not allowed now:

```txt
real document mutation
WYSIWYG
contenteditable
backend route integration
storage/auth behavior
artifact generation
exact layout claims
direct core source imports
```

## PASS

- Working set is the single runtime read projection for core-derived data.
- Envelope, read model, capabilities, and render projection are revision-aligned.
- Core read result envelopes include document id, revision, status, and failures.
- Core-derived async results use stale guards before applying.
- Stale guards reject document mismatch, revision mismatch, stale cache, and non-fresh envelopes.
- Core imports remain behind `src/core/`.
- Frontend runtime state remains separate from canonical core truth.

## FAIL / BLOCKER

Block the phase if:

- `FrontendCoreWorkingSet` starts storing canonical package objects.
- Any editor/app/component module imports `@flowdoc/vnext-core` directly.
- Any source file imports `../flowdoc-vnext-core/src/**`.
- A stale result can overwrite active working set data.
- A document-mismatched result can overwrite active working set data.
- Failure modes are represented with ad hoc strings instead of the shared vocabulary.
- Render projection summary is treated as exact/export layout truth.
- Selection, viewport, draft, or DOM state is stored inside the working set.

## RISK

- Fixture-backed data can look like a real core/API contract before the final
  packet shape is confirmed.
- A broad adapter could hide unsafe core usage.
- Render projection summaries may be mistaken for exact layout.
- Revision fields can drift if new derived caches are added without tests.

## UNKNOWN

- Final API transport envelope shape.
- Final browser-safe core export surface.
- Whether live layout will arrive from browser core, backend API, or both.
- Exact measured fragment shape needed before WYSIWYG.

## Required Tests

The phase must test:

```txt
envelope construction
readModel sourceRevision
capability mirror sourceRevision
renderProjection sourceRevision
renderProjection documentId
revision/sourceRevision/documentId stale guard
read result fresh/stale/document mismatch/missing projection behavior
no direct core source import
no direct package import outside src/core
```

## Intentionally Not Changed

```txt
no WYSIWYG
no contenteditable
no mutation bridge execution
no backend/API transport
no exact layout/export implementation
```
