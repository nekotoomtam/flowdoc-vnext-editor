# Core Contract Boundary

Status: accepted direction for the product editor frontend repository.

## Purpose

This document defines how the new FlowDoc vNext product editor frontend consumes `@flowdoc/vnext-core`.

The goal is to keep one shared document truth while preventing the frontend from becoming a second layout engine, a second document model, or a hidden copy of backend/runtime behavior.

The frontend editor and backend/API/worker may both use `@flowdoc/vnext-core`, but they must use it through different responsibility boundaries.

## Decision

`@flowdoc/vnext-core` is a shared core package.

It is not "the backend".

It is the shared document model, operation, graph, layout contract, renderer-consumption contract, diagnostics, and readiness boundary used by both frontend and backend.

The correct split is:

```txt
shared core
  -> package/document schema
  -> parser/serializer
  -> relationship graph
  -> operation/text/rich-inline contracts
  -> dirty scopes and invalidation facts
  -> layout/render contracts
  -> diagnostics/readiness vocabulary

frontend editor
  -> browser interaction runtime
  -> React UI
  -> canvas/page visual rendering
  -> selection/caret/IME/draft state
  -> viewport/scroll/render window
  -> command readiness and mutation queue
  -> live editor status display

backend/API/worker
  -> storage
  -> auth/authz
  -> durable save/checkpoint
  -> publish/version
  -> exact layout jobs
  -> PDF/DOCX artifact generation
  -> artifact pointers/status
  -> render API execution
```

## Core Is Shared, Runtime Is Not

Shared:

```txt
schema
node types
package parser
package serializer
relationship graph facts
operation contracts
text transaction rules
rich inline commit rules
dirty scope / invalidation facts
renderer consumption contracts
layout request/result contracts
diagnostics/readiness vocabulary
field/key/data contract
history-ready records
```

Frontend-only:

```txt
React components
DOM refs
browser Selection objects
caret geometry
IME composition state
active draft buffer
hover/focus state
scrollTop
viewport DOM measurement
render window state
overlay state
diagnostics panel open/closed state
```

Backend-only:

```txt
database/storage connection
auth/authz
server request/session context
durable jobs
artifact byte storage
PDF/DOCX byte generation
published version lifecycle
download URLs
workflow/submission route handling
```

## Import Boundary

All frontend access to `@flowdoc/vnext-core` must go through:

```txt
src/core/coreAdapter.ts
```

UI components must not import `@flowdoc/vnext-core` directly.

Allowed:

```txt
src/core/coreAdapter.ts
  imports from @flowdoc/vnext-core
```

Blocked:

```txt
src/app/**/*.tsx
  imports from @flowdoc/vnext-core

src/components/**/*.tsx
  imports from @flowdoc/vnext-core

src/editor/**/*.ts
  imports from @flowdoc/vnext-core

src/**/*.ts
  imports from ../flowdoc-vnext-core/src/**
```

Reason:

The adapter makes core consumption deliberate, reviewable, and replaceable. It prevents UI components from quietly becoming owners of document mutation, layout truth, diagnostics rules, or operation behavior.

## Core Dependency Rule

During local development, the frontend repository may use a sibling file dependency:

```json
{
  "dependencies": {
    "@flowdoc/vnext-core": "file:../flowdoc-vnext-core"
  }
}
```

Rules:

- import the package by name only;
- do not import `../flowdoc-vnext-core/src/**`;
- do not copy core source files into the frontend repository;
- do not fork core schema or operation rules in the frontend;
- do not create frontend-only document shapes that pretend to be canonical package truth.

## Core Adapter Responsibilities

`src/core/coreAdapter.ts` owns the frontend-facing adapter over `@flowdoc/vnext-core`.

It should expose only editor-safe functions.

Initial expected responsibilities:

```txt
load/parse canonical package
serialize canonical package when needed
create core-backed editable/session facts when allowed
read document metadata
read graph facts
read key/data diagnostics
build editor-safe node summaries
run allowed text/rich-inline transaction planning
return operation results and dirty scopes
return diagnostics/readiness summaries
return renderer/layout contract summaries when available
```

The adapter should not expose broad raw core access to React components.

Preferred pattern:

```txt
UI component
  -> editor runtime / command policy
  -> coreAdapter
  -> @flowdoc/vnext-core
```

Blocked pattern:

```txt
UI component
  -> @flowdoc/vnext-core
```

## Adapter Shape

The exact implementation may evolve, but the first adapter should aim for a narrow shape like:

```ts
export interface CoreDocumentLoadResult {
  status: "loaded" | "blocked"
  packageId: string | null
  documentId: string | null
  title: string | null
  packageVersion: number | null
  documentVersion: number | null
  diagnostics: CoreDiagnosticsSummary
  editorSeed: CoreEditorSeed | null
}

export interface CoreEditorSeed {
  nodes: CoreEditorNodeSummary[]
  sections: CoreEditorSectionSummary[]
  zones: CoreEditorZoneSummary[]
  fields: CoreFieldSummary[]
}

export interface CoreDiagnosticsSummary {
  graphIssueCount: number
  keyDataStatus: string
  keyDataErrors: number
  keyDataWarnings: number
  generationStatus: string
  exactLayoutStatus: string
  artifactStatus: string
}
```

This is only a shape guideline. Codex may adjust names/types if the core public API requires it.

The important rule is that the frontend receives editor-safe summaries and contracts, not unlimited ownership of core internals.

## Frontend Runtime Responsibilities

The frontend runtime may own browser-local editor truth:

```txt
normalized editor view
selection state
caret target
IME state
draft buffer
viewport state
scroll state
paper viewport geometry
render window
overlay state
command readiness state
mutation queue state
diagnostics display state
```

The frontend runtime must not persist these into the canonical package:

```txt
selection
caret geometry
hover
focus
scrollTop
DOM measurements
composition text
active draft values before commit
diagnostics panel state
render window
```

## Backend Runtime Responsibilities

Backend/API/worker code may also use `@flowdoc/vnext-core`, but it owns different responsibilities:

```txt
load canonical package from storage
validate package before save/publish/render
run exact layout when needed
prepare render API responses
prepare PDF/DOCX artifact jobs
write artifact bytes
return artifact pointer/status
enforce auth/authz
persist durable history/published versions
```

The frontend repository must not implement these backend responsibilities as production truth.

The frontend may display backend statuses later, but storage durability and artifact truth remain backend-owned.

## Document Truth Split

Do not collapse all truth into one object.

Use these truth layers:

```txt
Canonical truth:
  @flowdoc/vnext-core package/document

Layout truth:
  core measured pagination / renderer consumption contracts

Interaction truth:
  frontend browser runtime

Durable truth:
  backend storage / published version / durable history

Artifact truth:
  backend artifact job / output bytes / artifact pointer
```

Rules:

- frontend interaction truth may be temporary;
- frontend draft state may be optimistic;
- committed document changes must flow through core contracts;
- final export truth must come from core/backend exact layout and artifact generation;
- frontend visual rendering must draw from contracts, not invent final document truth.

## Layout Boundary

The frontend renderer is not a layout engine.

Allowed in frontend:

```txt
draw pages
draw paper shell
draw node cards
draw measured fragments when provided
draw text lines from render/layout contracts
draw selection/caret/edit overlays
map pointer coordinates to page/node/fragment metadata
request live layout or exact layout status
reconcile visible layout packets
```

Blocked in frontend:

```txt
decide final page breaks
decide final text wrapping truth
infer table row heights as canonical truth
treat DOM layout as canonical document layout
make export readiness claims
generate PDF/DOCX artifact bytes as production output
```

## Live Layout vs Exact Layout

The frontend may support live/visible/dirty-scope layout for editing UX.

Live layout:

```txt
browser/editor-facing
viewport-first
dirty-scope based
may be stale or optimistic
must not claim export readiness
can be reconciled after commit
```

Exact layout:

```txt
core/backend-facing
used for preview/export/publish/artifact jobs
must be deterministic
can mark editor layout stale/fresh
can produce renderer consumption for artifact paths
```

The editor may show live layout status and exact layout status separately.

Example status split:

```txt
liveLayoutStatus:
  fresh | stale | updating | blocked | unknown

exactLayoutStatus:
  fresh | stale | deferred | blocked | unknown
```

## Mutation Boundary

UI components must not mutate canonical package truth directly.

All document mutations should follow this direction:

```txt
user event
  -> command policy
  -> mutation queue / commit bridge
  -> coreAdapter
  -> @flowdoc/vnext-core operation/transaction
  -> operation result / packet / dirty scope
  -> runtime cache apply
  -> layout status update
  -> UI render update
```

Blocked:

```txt
button click
  -> directly modifies canonical package object in React state
```

Blocked:

```txt
contenteditable DOM
  -> innerHTML becomes document truth
```

Allowed:

```txt
active text-block island
  -> browser-local draft
  -> safe commit boundary
  -> core text/rich-inline transaction
```

## Core Data Entering Frontend

Core data entering the frontend should be converted into editor-safe runtime shapes.

Initial categories:

```txt
document metadata
node summaries
relationship facts
field/key summaries
diagnostics summaries
operation capability summaries
layout/readiness status summaries
```

Avoid passing huge recursive snapshots as active interaction truth.

A full snapshot may be acceptable for boot/debug, but the active editor runtime should use normalized indexes.

## Normalized Editor View Requirement

The editor runtime must derive lookup-first indexes.

Required early indexes:

```txt
nodeById
parentById
childrenById
sectionById
zoneById
nodeOrder
textBlockIds
tableIds
visibleNodeIds placeholder
dirtyNodeIds placeholder
changedSubtreeIds placeholder
```

Interaction paths should use indexes/selectors, not repeated recursive tree walks.

## Browser-Safe Core Usage

The frontend may use only browser-safe core functions.

Browser-safe means:

```txt
no Node-only file system access
no server-only storage adapter execution
no durable artifact byte writing
no backend route execution
no auth/authz enforcement
no process-dependent behavior
no direct PDF/DOCX production path as frontend truth
```

If a core export is not known to be browser-safe, do not use it in the frontend until a browser-safe boundary is documented.

## Future Core Subpath Exports

The frontend may initially import from the root package through `src/core/coreAdapter.ts`.

A later core package split may add:

```txt
@flowdoc/vnext-core/contracts
@flowdoc/vnext-core/browser
@flowdoc/vnext-core/node
```

Do not implement this split in the frontend repository.

Do not require this split for the first frontend scaffold.

Record it as a future improvement only.

## First Frontend Slice

The first frontend implementation slice should use the core adapter only for a minimal boundary.

Scope:

```txt
create coreAdapter placeholder
load static or fixture-backed package data when available
derive editor-safe metadata
derive normalized editor view seed
render shell placeholders from adapter result
show diagnostics/status placeholders
```

Do not implement yet:

```txt
real mutation bridge
WYSIWYG
contenteditable
layout execution
PDF/DOCX rendering
backend route integration
artifact job execution
publish/version behavior
```

## PASS

- Core is recognized as a shared package, not backend-only code.
- Frontend consumes core through `src/core/coreAdapter.ts`.
- UI components do not import core directly.
- Frontend does not import `../flowdoc-vnext-core/src/**`.
- Frontend owns browser interaction runtime only.
- Backend owns storage, auth, exact artifact jobs, and durable output.
- Layout truth remains core/backend-owned.
- Frontend visual rendering is contract-driven.
- Mutation flows through command policy, commit bridge, and core adapter.

## FAIL / BLOCKER

Block implementation if any of these occur:

- React components import `@flowdoc/vnext-core` directly.
- Frontend imports `../flowdoc-vnext-core/src/**`.
- Frontend copies core files into the frontend repository.
- Frontend creates a second canonical document model.
- UI components mutate canonical package objects directly.
- DOM or contenteditable HTML becomes document truth.
- Frontend decides final page breaks or text wrapping truth.
- Frontend generates PDF/DOCX artifact bytes as production truth.
- Backend storage/auth/artifact behavior is implemented inside the frontend repository.
- The core adapter becomes a broad unreviewed pass-through for all core exports.

## RISK

- The root core package currently exports many areas; the frontend may accidentally use node/server-only pieces.
- A broad adapter can become a hidden boundary bypass.
- React state can accidentally become canonical document truth.
- Live layout can be mistaken for exact/export-ready layout.
- Direct core imports in components can spread quickly and become hard to remove.
- Frontend may start implementing layout rules to make the canvas look right.
- Future browser/node subpath exports may be needed once the core API stabilizes.

## UNKNOWN

- Exact browser-safe subset of current core exports.
- Whether the core package needs `browser`, `node`, and `contracts` subpath exports later.
- Whether live layout will run entirely in the browser, through backend requests, or as a hybrid.
- How much measured fragment data is needed for the first product editor canvas.
- Whether the initial frontend will load only fixtures or connect to an API early.
- How the backend render API will be wired once the frontend shell is stable.

## Implementation Gate

Before moving beyond scaffold, verify:

```txt
No direct @flowdoc/vnext-core imports outside src/core/
No import from ../flowdoc-vnext-core/src/**
No copied core files
No UI direct package mutation
No DOM/contenteditable document truth
No backend storage/auth/artifact implementation in frontend repo
```

Suggested checks:

```txt
grep -R "@flowdoc/vnext-core" src
grep -R "../flowdoc-vnext-core/src" src
grep -R "innerHTML" src
```

`@flowdoc/vnext-core` should appear only in `src/core/*` unless a future boundary document explicitly allows more.

## Codex Handoff

Implement the core contract boundary as documentation and minimal scaffold only.

Scope:

```txt
- add docs/CORE_CONTRACT_BOUNDARY.md
- add src/core/coreAdapter.ts placeholder
- add src/core/coreTypes.ts placeholder if useful
- add src/core/coreBoundaryChecks.ts placeholder if useful
- ensure app/components do not import @flowdoc/vnext-core directly
- ensure the first shell reads only adapter-safe placeholder data
```

Do not implement:

```txt
- WYSIWYG
- contenteditable
- real mutation bridge
- exact layout execution
- PDF/DOCX generation
- backend route integration
- storage/auth/artifact behavior
- core package subpath export changes
```

Required report format:

```txt
PASS:
FAIL / BLOCKER:
RISK:
UNKNOWN:
Files changed:
Behavior changed:
Tests run:
Risks left:
Intentionally not changed:
```
