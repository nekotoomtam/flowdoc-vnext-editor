# Product Editor Plan

Status: accepted phase plan for the FlowDoc vNext product editor frontend.

## Purpose

This document defines the product editor frontend plan for `flowdoc-vnext-editor`.

The goal is to build the real FlowDoc vNext browser editor surface as a separate frontend repository.

This is not a lab/debug UI.

This is not a WYSIWYG implementation plan yet.

This plan establishes the order of work needed before WYSIWYG can safely begin.

## Product Editor Definition

The product editor is the real user-facing document editor surface for FlowDoc vNext.

It should allow users to work with structured documents directly on a page/canvas while preserving:

```txt
canonical package truth
document structure
field/key references
diagnostics
layout/render contracts
history-ready operation boundaries
export consistency
long-document responsiveness
```

The product editor must feel like a direct document editor, but it must not become a second layout engine or a second document model.

## North Star

FlowDoc vNext editor is a structured web document editor.

The user should feel:

```txt
typing happens in the document surface
selection and click behavior are stable
long documents remain responsive
fields and structure are visible and understandable
diagnostics guide the user without disturbing the canvas
editor preview and export are based on the same core truth
```

The editor must support long documents as a first-class acceptance target, not as a later optimization.

## Source Of Truth

Truth is split into separate layers:

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

The product editor frontend owns interaction truth only.

The frontend may render visual pages and overlays, but it must not decide final page breaks, final text wrapping truth, table row height truth, or artifact truth.

## Non-Negotiables

The product editor must follow these rules:

```txt
1. New editor is separate from lab/debug UI.
2. Core access goes through src/core/coreAdapter.ts.
3. React components do not import @flowdoc/vnext-core directly.
4. Active runtime uses normalized editor view, not repeated recursive tree walking.
5. Canvas scroll is isolated from body scroll.
6. Scroll events do not rerender the whole app.
7. Paper/page geometry is stable before real content editing.
8. Selection is separate from viewport/scroll state.
9. Diagnostics must not reflow the canvas.
10. WYSIWYG starts only after shell, paper, scroll, selection, render partition, virtualization, diagnostics, and command policy gates pass.
11. No full-document contenteditable.
12. No ProseMirror/Slate/TipTap before WYSIWYG gate.
13. No monolithic EditorShell.
```

## Target Repository

```txt
flowdoc-vnext-editor/
```

Initial stack is defined in:

```txt
docs/STACK_DECISION.md
```

Core usage is defined in:

```txt
docs/CORE_CONTRACT_BOUNDARY.md
```

Lab separation is defined in:

```txt
docs/LAB_BOUNDARY_DECISION.md
```

Runtime ownership is defined in:

```txt
docs/RUNTIME_OWNERSHIP.md
```

The active read-only core binding working set contract is defined in:

```txt
docs/CORE_READ_BINDING_WORKING_SET.md
```

## Target UX Shell

The first real editor shell should be structured as:

```txt
┌────────────────────────────────────────────────────────────┐
│ App Header: name / save / publish / render status          │
├────────────────────────────────────────────────────────────┤
│ Toolbar: insert / text controls / fields / view controls   │
├───────────────┬───────────────────────────┬────────────────┤
│ Left Rail     │ Canvas / Page Surface      │ Right Inspector│
│ - Outline     │ - scroll root              │ - selected node│
│ - Pages       │ - paper pages              │ - props/style  │
│ - Fields      │ - overlays                 │ - diagnostics  │
│ - Diagnostics │ - active island later      │ - readiness    │
├───────────────┴───────────────────────────┴────────────────┤
│ Status Bar: revision / layout stale / warnings / debug     │
└────────────────────────────────────────────────────────────┘
```

This shell is only the visual frame. The runtime architecture is more important than visual polish.

## Phase Overview

```txt
Phase 0: Repo + Boundary Docs
Phase 1: New Editor Entry
Phase 1.5: Core Adapter + Normalized Editor View
Phase 1.6: Core Read Binding Working Set
Phase 2: Real Paper
Phase 3: Stable Canvas Viewport
Phase 4: Render Partition + Runtime Ownership
Phase 5: Selection / Hit Testing
Phase 6: Virtualization
Phase 7: Diagnostics Overlay
Phase 8: Outline / Inspector Integration
Phase 8.5: Command Policy / Mutation Bridge Dry Run
Phase 9: WYSIWYG Gate
Phase 10: Active Text-Block Island
```

Implementation should start only with Phase 0, Phase 1, and Phase 1.5.

Do not start WYSIWYG early.

---

# Phase 0: Repo + Boundary Docs

## Goal

Create the frontend repository foundation and lock architectural boundaries before implementation grows.

## Scope

```txt
create Vite + React + TypeScript repo
add docs
add Node/version policy
add package scripts
add initial folders
add core adapter placeholder
add thin editor shell placeholder if needed
```

## Required Documents

```txt
docs/STACK_DECISION.md
docs/CORE_CONTRACT_BOUNDARY.md
docs/LAB_BOUNDARY_DECISION.md
docs/RUNTIME_OWNERSHIP.md
docs/PRODUCT_EDITOR_PLAN.md
```

## Required Files

```txt
.nvmrc
index.html
package.json
vite.config.ts
tsconfig.json
vitest.config.ts
src/main.tsx
src/app/EditorApp.tsx
src/app/EditorShell.tsx
src/core/coreAdapter.ts
src/styles/tokens.css
src/styles/app.css
src/styles/editor.css
```

## Gate

```txt
/editor app boots through root index.html
npm install succeeds
npm run type-check succeeds
npm run test succeeds
npm run build succeeds
npm run check succeeds
@flowdoc/vnext-core dependency uses package boundary
no direct import from ../flowdoc-vnext-core/src/**
no lab/debug app.js import
no whole-app innerHTML render loop
no WYSIWYG framework
no contenteditable
```

## Intentionally Not Changed

```txt
no real paper model
no mutation bridge
no WYSIWYG
no virtualization
no backend route integration
no Playwright
```

---

# Phase 1: New Editor Entry

## Goal

Create the real product editor entrypoint and shell layout.

## Scope

```txt
root index.html entry
src/main.tsx
EditorApp
EditorShell
basic app header
basic toolbar
left rail placeholder
center canvas placeholder
right inspector placeholder
bottom status placeholder
CSS variables and shell layout
canvas scroll root
```

## Required Behavior

```txt
editor opens in browser
canvas has its own scroll container
body scroll is not used for document canvas
shell regions are visually stable
toolbar/header do not participate in canvas scroll measurement
```

## Gate

```txt
index.html boots the app
toolbar / outline / canvas / inspector / status are visible
canvas scroll root is independent
body scroll remains stable
no lab render loop
no whole-app innerHTML rerender
EditorShell remains thin
```

## Intentionally Not Changed

```txt
no real document rendering
no node selection
no paper model
no WYSIWYG
no mutation
```

---

# Phase 1.5: Core Adapter + Normalized Editor View

## Goal

Create the real data boundary and editor read model before rendering document content.

## Scope

```txt
src/core/coreAdapter.ts
src/core/coreTypes.ts
src/core/fixtureLoader.ts if needed
src/editor/runtime/editorView.ts
src/editor/runtime/editorState.ts
outline placeholder reads editorView
inspector placeholder reads editorView
canvas placeholder reads editorView
```

## Core Adapter

The adapter should expose editor-safe functions only.

Initial shape may include:

```txt
loadEditorSeed
getDocumentMetadata
getDiagnosticsSummary
getNodeSummaries
getFieldSummaries
```

It should not expose broad raw core access.

## Normalized Editor View

Required indexes:

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

Required selectors:

```txt
getNodeById
getParentId
getChildren
getOutlineItems
getInspectorFacts
getRenderableNodeSummary
```

## Gate

```txt
components do not import @flowdoc/vnext-core directly
only src/core/* imports @flowdoc/vnext-core
no import from ../flowdoc-vnext-core/src/**
outline/canvas/inspector read from the same normalized editor view
click/select lookup path can use nodeById
no repeated recursive tree walk in active interaction path
canonical package is not mutated
```

## Intentionally Not Changed

```txt
no real mutation
no WYSIWYG
no paper geometry
no virtualization
no backend integration
```

---

# Phase 1.6: Core Read Binding Working Set

## Goal

Bind adapter-safe core read data into one runtime working set before adding new
features.

## Scope

```txt
FrontendCoreWorkingSet
core snapshot envelope
normalized read model
capability mirror
render projection summary
diagnostics summary
revision/sourceRevision stale guards
runtime apply gates for derived results
boundary tests for direct core source imports
```

## Gate

```txt
envelope/readModel/capabilities/renderProjection share source revision
stale baseRevision/sourceRevision results are blocked
no direct @flowdoc/vnext-core import outside src/core/
no direct ../flowdoc-vnext-core/src/** import anywhere in src/
working set does not own selection/viewport/draft/DOM state
```

## Intentionally Not Changed

```txt
no real mutation
no WYSIWYG
no contenteditable
no backend/API transport
no exact layout/export implementation
```

---

# Phase 2: Real Paper

## Goal

Make the canvas behave like a real document surface before real editing begins.

## Scope

```txt
paper preset
A4
Letter
page width
page height
margins
zoom scale
page gap
page background
page shadow
stable page bounding boxes
page coordinate helpers
```

## Files

```txt
src/editor/paper/paperModel.ts
src/editor/paper/paperGeometry.ts
src/components/paper/PaperPage.tsx
src/components/canvas/CanvasSurface.tsx
```

## Required Behavior

```txt
page dimensions come from paper model
document scroll height comes from page model
zoom changes preserve visual center when possible
top/bottom scroll does not jump
page bounding boxes are queryable
```

## Gate

```txt
A4 renders with stable dimensions
Letter renders with stable dimensions
zoom in/out does not break canvas center
scroll height is deterministic from page model
paper geometry does not depend on rendered node content
paper model does not decide content page breaks
```

## Intentionally Not Changed

```txt
no real measured pagination rendering
no text wrapping truth
no table row height truth
no WYSIWYG
```

---

# Phase 3: Stable Canvas Viewport

## Goal

Make scroll and viewport behavior stable before adding hit-test, virtualization, or WYSIWYG.

## Scope

```txt
viewport state owner
scroll position read path
canvas viewport bounds
page shell measurement
debounced measurement apply path
explicit measurement apply command
scroll probe hooks if needed
```

## Files

```txt
src/editor/viewport/viewportState.ts
src/editor/viewport/viewportMeasurement.ts
src/editor/viewport/scrollAnchor.ts
src/components/canvas/CanvasScrollRoot.tsx
```

## Rules

```txt
scroll event must not rerender the whole app
scroll event may read measurement
scroll event must not mutate layout truth immediately
normal user scroll must not trigger scrollTop write-back
sticky header/toolbar must not be part of canvas measurement path
```

## Gate

```txt
fast scroll top-to-bottom does not freeze
reverse scroll responds immediately
scrollTop is not written back during normal user scroll
scrollbar range does not jump after idle
viewport state is separate from selection state
browser smoke/probe can be added if needed
```

## Intentionally Not Changed

```txt
no selection hit-test
no virtualization
no WYSIWYG
no mutation
```

---

# Phase 4: Render Partition + Runtime Ownership

## Goal

Ensure the editor renders in scoped partitions and runtime ownership remains clean.

## Scope

Render partitions:

```txt
shell
toolbar
outline
canvas
paper/page
node/card
selection overlay
diagnostics
inspector
status
```

Runtime owners:

```txt
editorView
runtimeCache
viewport
paper
selection
diagnostics
commands placeholder
layout status placeholder
```

## Required Behavior

```txt
selection overlay can update without rebuilding the whole shell
scrolling does not update inspector/status unless their inputs change
inspector reads selected node facts
toolbar reads command readiness placeholder
diagnostics reads state without owning it
```

## Gate

```txt
click/select does not rebuild unrelated shell regions unnecessarily
scroll does not touch inspector/status unless necessary
canvas render is scoped
no single file owns state + render + events + commands + mutation + diagnostics + viewport
EditorShell remains a coordinator only
```

## Intentionally Not Changed

```txt
no WYSIWYG
no real mutation
no rich inline command execution
no backend integration
```

---

# Phase 5: Selection / Hit Testing

## Goal

Make click and selection behavior reliable on the paper/canvas.

## Scope

```txt
structural selection state
hit-test from DOM/page coordinate to page/node
selected node overlay
selection reason/revision
click-after-scroll safety
overlay pointer-event policy
```

## Files

```txt
src/editor/selection/selectionState.ts
src/editor/selection/hitTest.ts
src/components/canvas/SelectionOverlay.tsx
```

## Selection Categories

Keep these separate:

```txt
structural selection
text target placeholder
draft text selection later
diagnostic target
viewport anchor
```

## Gate

```txt
click target selects correct node
click after fast scroll selects correct node
sticky toolbar/header/overlay does not block hit-test incorrectly
scroll measurement does not change selection
selection is not persisted into canonical package
selection state is separate from viewport state
```

## Intentionally Not Changed

```txt
no text caret
no contenteditable
no WYSIWYG
no mutation
```

---

# Phase 6: Virtualization

## Goal

Support long documents without fake scrollbar behavior or selection loss.

## Scope

```txt
render window
visible pages
overscan
off-window spacer geometry
mount/unmount page boundaries
selection preservation
scroll preservation
```

## Files

```txt
src/editor/viewport/renderWindow.ts
src/components/canvas/RenderWindow.tsx
src/components/paper/PageSpacer.tsx
```

## Rules

```txt
total document height comes from page model
mounted pages may change but total scroll range must remain stable
off-window pages use spacer/placeholder geometry
overscan must be explicit
selection must survive page mount/unmount
```

## Gate

```txt
maxScrollTop does not jump after idle
page mount/unmount does not clear selected node
fast scroll remains responsive
reverse scroll remains responsive
overscan is visible in diagnostics/debug state
```

## Intentionally Not Changed

```txt
no WYSIWYG
no exact layout rendering claim
no mutation
```

---

# Phase 7: Diagnostics Overlay

## Goal

Keep debugging visibility without disturbing the editor UX.

## Scope

```txt
diagnostics panel or overlay toggle
read-only diagnostics model
viewport facts display
render window display
selection facts display
paper bounds display
normalized view counts display
layout status placeholder display
```

## Files

```txt
src/editor/diagnostics/diagnosticsState.ts
src/components/diagnostics/DiagnosticsPanel.tsx
```

## Rules

```txt
diagnostics reads state
diagnostics does not own state
diagnostics does not reflow canvas
diagnostics does not change scroll geometry
diagnostics does not intercept canvas clicks accidentally
```

## Gate

```txt
open diagnostics does not reflow canvas
close diagnostics does not affect scroll/click
diagnostics can be disabled without changing editor behavior
diagnostics jump is not implemented unless routed through explicit anchor command
```

## Intentionally Not Changed

```txt
no mutation from diagnostics
no hidden debug dependency
no WYSIWYG
```

---

# Phase 8: Outline / Inspector Integration

## Goal

Wire editor tools around the canvas without letting them control canvas state incorrectly.

## Scope

```txt
outline from normalized editor view
outline click jump
inspector selected node facts
explicit viewport anchor command
jump reason tracking
status updates
```

## Files

```txt
src/components/outline/OutlinePanel.tsx
src/components/inspector/InspectorPanel.tsx
src/editor/viewport/scrollAnchor.ts
```

## Rules

```txt
outline click intentionally jumps to node
user scroll is not treated as outline jump
anchor restore runs only for explicit jump command
inspector reads selected node facts and does not own selection
inspector update must not cause canvas scroll jump
```

## Gate

```txt
outline jump lands on intended node/page
inspector updates when selected node changes
inspector update does not cause canvas scroll jump
user scroll does not trigger anchor restore
anchor restore only happens on explicit jump command
```

## Intentionally Not Changed

```txt
no editable inspector mutation
no WYSIWYG
no backend integration
```

---

# Phase 8.5: Command Policy / Mutation Bridge Dry Run

## Goal

Prove editor intent can flow through a controlled boundary before WYSIWYG starts.

## Scope

```txt
command policy module
command readiness
disabled reason
target resolution
mutation queue placeholder
commit bridge dry run
latest-only/revision guard shape
mock packet apply if useful
```

## Files

```txt
src/editor/commands/commandPolicy.ts
src/editor/mutations/mutationQueue.ts
src/editor/mutations/commitBridge.ts
src/editor/runtime/runtimeCache.ts
```

## Initial Commands

```txt
select node
jump to node
insert placeholder command
delete placeholder command
edit text placeholder command
```

## Gate

```txt
every command has canExecute and reason
unsupported target rejects with reason
UI component does not mutate canonical package directly
mutation/apply path is centralized
selected node survives unrelated packet/mock update
stale packet/result shape is rejected
```

## Intentionally Not Changed

```txt
no real WYSIWYG
no production rich inline mutation
no collaboration/offline claim
no backend storage
```

---

# Phase 9: WYSIWYG Gate

## Goal

Decide whether the editor is ready to start active text editing.

WYSIWYG implementation may start only after this gate passes.

## Required Prerequisites

```txt
Phase 0 boundary docs complete
Phase 1 editor entry complete
Phase 1.5 core adapter + normalized editor view complete
Phase 2 real paper complete
Phase 3 stable viewport complete
Phase 4 render partition complete
Phase 5 selection/hit-test complete
Phase 6 virtualization complete
Phase 7 diagnostics isolation complete
Phase 8 outline/inspector integration complete
Phase 8.5 command policy/mutation dry run complete
browser smoke/probe passes where needed
```

## Input Model Decision

Accepted direction:

```txt
Hybrid Managed Cards + one Active Text-Block Island
```

Blocked:

```txt
full-document contenteditable
ProseMirror/Slate/TipTap integration
DOM innerHTML as document truth
field chip flattening
rich inline flattening
```

## Gate

```txt
written WYSIWYG entry decision confirms prerequisites
active text-block island design is approved
IME policy is explicit
fallback policy is explicit
commit path is through coreAdapter/mutation bridge
no WYSIWYG code is added before gate passes
```

## Intentionally Not Changed

```txt
no active text editing unless gate passes
```

---

# Phase 10: Active Text-Block Island

## Goal

Allow the user to edit a text block directly in the document surface safely.

## Scope

```txt
one active text-block island at a time
draft buffer
browser-local selection/range inside island
IME composition policy
textarea fallback
contenteditable binding only when safe
commit-ready facts
commit through mutation bridge/core adapter
rejection recovery
layout stale marking
```

## Files

```txt
src/editor/draft/activeTextBlockIsland.ts
src/editor/draft/draftBuffer.ts
src/editor/draft/imePolicy.ts
src/editor/draft/textareaFallback.ts
src/editor/draft/contenteditableBinding.ts
src/editor/mutations/commitBridge.ts
```

## Rules

```txt
do not commit while IME composition is active
do not make contenteditable innerHTML document truth
unsafe inline structures must guard, reject, or fallback
draft state is browser-local until commit boundary
rejected commit must not destroy newer local draft
only committed changes flow into canonical package through core contract
```

## Gate

```txt
click text-block opens active island
typing updates local draft immediately
IME composition does not flood durable history
commit goes through command/mutation/coreAdapter path
rejected commit does not destroy current draft
unsafe inline shape falls back or rejects with reason
no full-document contenteditable
```

---

# Testing Strategy

## Early Phases

Use Vitest for pure runtime tests:

```txt
editorView index tests
paper geometry tests
viewport calculation tests
selection state tests
command policy tests
mutation guard tests
diagnostics state tests
```

## Browser Phases

Add Playwright/browser smoke when testing:

```txt
scroll stability
click-after-scroll hit-test
viewport measurement
virtualization
fast scroll
reverse scroll
diagnostics overlay
canvas reflow behavior
```

## Required Check

Every phase should keep:

```txt
npm run type-check
npm run test
npm run build
npm run check
```

green unless explicitly blocked.

---

# Review Template

Every phase handoff must report:

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

Every phase must answer:

```txt
1. Which module owns the new behavior?
2. Which module coordinates it?
3. Did any file gain unrelated responsibility?
4. Can this behavior be tested without rendering the whole shell?
5. Does this keep core truth, browser runtime truth, layout truth, and artifact truth separate?
6. Does this preserve the lab/product boundary?
7. Does this preserve normalized editor view as active runtime shape?
```

---

# First Codex Handoff

Implement only:

```txt
Phase 0
Phase 1
Phase 1.5
```

Scope:

```txt
create repo scaffold
add stack/core/lab/runtime/product docs
add Vite + React + TypeScript
add index.html root entry
add basic EditorApp/EditorShell
add CSS shell
add coreAdapter placeholder
add normalized editorView placeholder
add outline/canvas/inspector placeholders from same editor view
add minimal Vitest placeholder
```

Do not implement:

```txt
WYSIWYG
contenteditable
real mutation bridge
real paper model
virtualization
Playwright
Tailwind
UI kit
rich editor framework
backend/API integration
artifact rendering
```

## First Slice Gate

```txt
/editor app opens
shell regions are visible
core adapter boundary exists
normalized editor view placeholder exists
outline/canvas/inspector read from same view
no direct core import outside src/core/
no lab app.js import
no whole-app innerHTML render loop
no contenteditable
no WYSIWYG framework
npm run check passes
```

## PASS

- Product editor phase plan is defined.
- WYSIWYG is explicitly gated.
- Runtime ownership is respected.
- Core/lab boundaries are respected.
- First implementation slice is intentionally small.
- Long-document readiness is treated as a first-class target.

## FAIL / BLOCKER

Block implementation if:

```txt
Codex starts WYSIWYG before Phase 9
new editor imports lab app.js
React components import core directly
EditorShell becomes monolithic
scroll event rerenders whole app
selection and viewport state are collapsed
paper model becomes layout truth
diagnostics reflows canvas
UI mutates canonical package directly
rich editor framework is added early
```

## RISK

```txt
The editor may look too simple in early phases, but that is intentional.
A pretty shell without runtime boundaries is a trap.
Paper/scroll/selection stability must come before text editing.
Codex may try to reuse lab code because it is faster.
React state may become runtime truth if not reviewed.
```

## UNKNOWN

```txt
exact first fixture/API loading path
exact live layout execution location
exact measured fragment format needed for first canvas
when Playwright should be introduced
whether a state manager is needed later
whether core needs browser/node/contracts subpath exports later
```
