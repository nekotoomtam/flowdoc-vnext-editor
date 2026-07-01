# Lab Boundary Decision

Status: accepted boundary for the product editor frontend repository.

## Purpose

This document separates the existing FlowDoc vNext sandbox/lab UI from the new product editor frontend.

The goal is to prevent the new editor from inheriting the old lab runtime shape, whole-app render loop, mixed state ownership, or debug-first UI behavior.

The lab remains useful.

The lab is not the product editor.

## Decision

The existing template-builder sandbox / lab UI is classified as:

```txt
debug/reference evidence only
```

The new frontend repository is classified as:

```txt
product editor surface
```

The new editor must not import, copy, or depend on the lab UI runtime as its application architecture.

The lab can provide:

```txt
evidence
fixtures
contract examples
pure helper ideas
debug comparison points
browser behavior lessons
```

The lab must not provide:

```txt
production editor render loop
production editor state shape
production editor DOM ownership model
production editor event architecture
production editor component hierarchy
production editor WYSIWYG model
```

## Scope

This decision applies to the new repository:

```txt
flowdoc-vnext-editor
```

It also applies to any future product editor work that consumes:

```txt
@flowdoc/vnext-core
```

The lab/sandbox may remain in the core repository or another debug location. It does not need to be deleted.

## Background

The sandbox/lab was created to prove boundaries and visible behavior while the core/runtime contracts were still being shaped.

That was acceptable for exploration.

It is not acceptable as the production editor architecture.

The product editor must be long-lived, modular, testable, and stable under long-document editing. It must split responsibilities before adding deeper behavior.

## Boundary Summary

```txt
lab/debug UI
  -> proves concepts
  -> visualizes contracts
  -> helps inspect state
  -> may use simplified rendering
  -> may use broad debug snapshots
  -> may contain temporary mixed responsibilities

product editor
  -> real user-facing editor surface
  -> long-lived architecture
  -> normalized runtime view
  -> stable canvas/paper/viewport
  -> clear runtime ownership
  -> command policy and mutation boundary
  -> guarded WYSIWYG path
```

## Allowed Lab Usage

The new editor may use the lab as reference for:

```txt
how a core contract was previously consumed
what a packet shape looked like in practice
what a browser issue looked like
what a previous debug UI displayed
what failure modes were observed
fixture ideas
test scenario ideas
naming evidence before rewriting into product terms
```

Allowed examples:

```txt
Read lab code to understand an old issue.
Read lab diagnostics to design a better diagnostics panel.
Read lab fixture usage to decide what product shell should load first.
Use a lab browser probe as evidence for a new product test.
Extract a small pure helper only if dependency-clean and rewritten.
```

## Blocked Lab Usage

The new editor must not:

```txt
import the lab app entry
import the lab global state object
import the lab render loop
copy the lab whole-app rerender pattern
copy the lab DOM ownership pattern
copy the lab UI behavior as production truth
treat lab recursive snapshots as the active editor runtime
treat lab debug state as product editor state
treat lab WYSIWYG behavior as accepted production behavior
```

Blocked examples:

```txt
import examples/template-builder-sandbox/public/app.js
copy app.js into src/app/EditorApp.tsx
use app.innerHTML whole-app render as the editor render strategy
make the lab state object the product editor store
reuse lab event handlers as production interaction policy
reuse lab DOM ranges or contenteditable behavior without a product gate
```

## File Boundary

Expected lab/debug files may include paths like:

```txt
examples/template-builder-sandbox/**
```

Expected product editor files should live in the frontend repository:

```txt
flowdoc-vnext-editor/
  src/
  docs/
  index.html
  package.json
```

If the product editor ever lives in the same repository as the lab, the paths must still be separated clearly:

```txt
examples/template-builder-sandbox/**
  -> lab/debug only

apps/flowdoc-editor/**
  -> product editor only
```

## Import Rules

Blocked imports in the product editor:

```txt
examples/template-builder-sandbox/public/app.js
examples/template-builder-sandbox/public/*.js
examples/template-builder-sandbox/scripts/*
```

A product editor module must not import lab browser files directly.

Allowed:

```txt
Read lab source during design/review.
Reference lab docs in planning.
Use lab fixture ideas after converting to product editor boundary.
Create new product modules with product ownership.
```

If a small helper must be moved, it must pass all of these checks:

```txt
the helper is pure
the helper is dependency-clean
the helper does not own DOM state
the helper does not own render loop behavior
the helper does not import lab global state
the helper is renamed/reframed into product editor terms
the helper has focused tests in the product editor repo
```

## Render Loop Boundary

The product editor must not use a whole-app render loop copied from the lab.

Blocked pattern:

```txt
state changed
  -> app.innerHTML = renderWholeApp(state)
  -> rebind all event handlers
```

Accepted direction:

```txt
runtime modules own state
React components render scoped state
events dispatch explicit intents
render partitions update only when inputs change
canvas/selection/diagnostics/inspector remain separately owned
```

The product editor should have clear render partitions:

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

## State Ownership Boundary

The product editor must not inherit a single lab-style state object that owns everything.

Blocked state ownership:

```txt
one app state owns:
  package data
  normalized view
  viewport
  scroll
  selection
  draft
  command policy
  mutation queue
  diagnostics
  render window
  event bindings
```

Accepted ownership:

```txt
coreAdapter
  -> core access boundary

editorView
  -> normalized indexes

runtimeCache
  -> packet/apply/revision guards

viewport
  -> scroll/measurement/render window

selection
  -> selected node/range/caret target

draft
  -> active text island / IME / draft buffer

commands
  -> canExecute / reason / intent shaping

mutations
  -> queue / commit / rejection / latest-only

layout
  -> live/exact status / reconcile

diagnostics
  -> read-only issue/status view
```

## Diagnostics Boundary

The lab may prioritize diagnostics over UX.

The product editor may include diagnostics, but diagnostics must not disturb UX.

Product diagnostics must:

```txt
be toggleable
read state rather than own it
not reflow the canvas when opened
not change scroll geometry
not intercept click targets accidentally
not mutate document truth by default
```

Debug panels are allowed.

Debug-driven architecture is not allowed.

## Snapshot Boundary

The lab may boot from broad snapshots.

The product editor may use a full snapshot for boot/debug only.

The product editor active runtime must derive normalized indexes:

```txt
nodeById
parentById
childrenById
sectionById
zoneById
nodeOrder
visibleNodeIds
dirtyNodeIds
changedSubtreeIds
```

Interaction paths must not walk full recursive snapshots repeatedly.

Blocked:

```txt
click node
  -> walk full recursive tree
  -> derive selection
  -> rebuild whole UI
```

Accepted:

```txt
click node
  -> hit test id
  -> selection state update
  -> selector reads nodeById
  -> affected views update
```

## WYSIWYG Boundary

Lab WYSIWYG or draft behavior is not automatically accepted for the product editor.

The product editor WYSIWYG path must pass its own gate.

Accepted future direction:

```txt
Hybrid Managed Cards + one Active Text-Block Island
```

Blocked before gate:

```txt
full-document contenteditable
rich editor framework integration
DOM innerHTML as document truth
lab contenteditable behavior copied directly
silent flattening of rich inline/field chips
```

WYSIWYG must start only after:

```txt
product editor shell exists
core adapter boundary exists
normalized editor view exists
paper model is stable
scroll is stable
render partition exists
selection/hit-test is stable
virtualization is stable
diagnostics does not disturb layout
command policy and mutation dry run exist
```

## Migration Rule

Default decision:

```txt
rewrite in product editor terms
```

A lab unit may be reused only if it is:

```txt
small
pure
dependency-clean
not a render loop
not a global state owner
not DOM-state-coupled
not event-architecture-coupled
not WYSIWYG behavior-coupled
covered by product editor tests
```

If any condition fails, the product editor must write a new implementation.

## Documentation Rule

Every product editor phase that touches lab evidence must say:

```txt
Lab evidence used:
Decision: reference / rewrite / copy small helper / reject
Reason:
Risk:
Tests:
Intentionally not copied:
```

## Product Editor First Slice

The first product editor slice should not depend on lab runtime.

Scope:

```txt
create product editor shell
create core adapter placeholder
create normalized editor view placeholder
create outline/canvas/inspector placeholders
create CSS tokens
create boundary docs
```

Do not implement:

```txt
lab render loop migration
lab state migration
lab event handler migration
lab contenteditable migration
WYSIWYG
mutation bridge
virtualization
Playwright browser probes
```

## PASS

- Lab is explicitly classified as debug/reference evidence only.
- Product editor is explicitly classified as the real editor surface.
- Product editor does not import lab app/runtime files.
- Product editor does not copy lab whole-app render loop.
- Product editor does not inherit lab global state shape.
- Product editor may reference lab evidence during design/review.
- Any reused helper must be pure, dependency-clean, rewritten, and tested.
- Product editor WYSIWYG remains gated.

## FAIL / BLOCKER

Block implementation if any of these occur:

- Product editor imports `examples/template-builder-sandbox/public/app.js`.
- Product editor imports lab public browser files directly.
- Product editor copies the lab render loop.
- Product editor uses whole-app `innerHTML` rerender as architecture.
- Product editor makes lab global state the product editor store.
- Product editor treats broad recursive lab snapshots as active interaction truth.
- Product editor copies lab contenteditable/WYSIWYG behavior before WYSIWYG gate.
- Diagnostics/debug code participates in canvas layout truth.
- A product shell file becomes the new monolithic owner of state, render, events, commands, mutation, diagnostics, and viewport.

## RISK

- Lab code may look convenient and cause accidental architecture drift.
- A copied helper may bring hidden assumptions about state/render/event order.
- Debug-first UI behavior may leak into product UX.
- Whole-app rerender patterns may hide early but break scroll/selection later.
- Recursive snapshot rendering may be acceptable for small fixtures but fail long-document behavior.
- Diagnostics panels may accidentally affect canvas measurement.
- WYSIWYG may be started from lab behavior before product gates are ready.

## UNKNOWN

- Which lab helpers are truly pure and reusable.
- Which lab browser probes should become product editor browser smokes later.
- Whether old diagnostics views should be replaced or redesigned.
- Whether lab fixture shapes are enough for the first product editor shell.
- Whether any lab module should be moved to a separate shared testing utility later.

## Implementation Gate

Before moving beyond the product editor scaffold, verify:

```txt
No import from examples/template-builder-sandbox/public/app.js
No import from examples/template-builder-sandbox/public/*.js
No copied app.innerHTML whole-app render loop
No lab global state copied as product editor state
No contenteditable/WYSIWYG copied from lab
No diagnostics code affecting canvas layout geometry
```

Suggested checks:

```txt
grep -R "template-builder-sandbox/public/app" src
grep -R "app.innerHTML" src
grep -R "innerHTML" src
```

Any `innerHTML` usage must be reviewed. It is blocked as an app render strategy.

## Codex Handoff

Implement this boundary as documentation first.

Scope:

```txt
- add docs/LAB_BOUNDARY_DECISION.md
- keep lab/debug UI untouched
- update AGENTS.md or product plan to reference this boundary if useful
- do not import lab code into product editor
- do not copy lab render loop into product editor
```

Do not implement:

```txt
- lab migration
- WYSIWYG
- contenteditable
- mutation bridge
- virtualization
- Playwright
- product diagnostics behavior
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
