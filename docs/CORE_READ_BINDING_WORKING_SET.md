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
readModel.sourceRevision
capabilities.sourceRevision
renderProjection.sourceRevision
diagnostics source
```

Any core-derived result that cannot prove it belongs to the active document
revision must be blocked as stale.

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
sourceRevision matches envelope.documentRevision
stale cache flags are rejected
stale envelopes are not treated as fresh
older async results cannot overwrite newer working set data
```

Blocked apply behavior:

```txt
apply result with old baseRevision
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
derive normalized read model
derive command capability mirror
derive render projection summary
apply fresh diagnostics/render/job results through revision gates
block stale results
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
- Core-derived async results use stale guards before applying.
- Core imports remain behind `src/core/`.
- Frontend runtime state remains separate from canonical core truth.

## FAIL / BLOCKER

Block the phase if:

- `FrontendCoreWorkingSet` starts storing canonical package objects.
- Any editor/app/component module imports `@flowdoc/vnext-core` directly.
- Any source file imports `../flowdoc-vnext-core/src/**`.
- A stale result can overwrite active working set data.
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
revision/sourceRevision stale guard
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
