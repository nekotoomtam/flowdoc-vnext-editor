# Runtime Ownership

Status: accepted ownership contract for the product editor frontend repository.

## Purpose

This document defines runtime ownership for the FlowDoc vNext product editor frontend.

The goal is to prevent the product editor from becoming a monolithic shell where one file owns state shape, rendering, event binding, command policy, mutation transport, diagnostics, viewport behavior, draft input, and core integration.

The product editor must be modular by behavior ownership.

React components render state and dispatch intent. Runtime modules own behavior.

## Decision

The product editor frontend must split runtime responsibilities into clear owners.

The accepted direction is:

```txt
coreAdapter
  -> boundary to @flowdoc/vnext-core

coreBinding
  -> read-only working set, envelope, read model, capabilities, render projection summaries

editorView
  -> normalized lookup-first editor view

runtimeCache
  -> packet application and revision guards

viewport
  -> scroll, measurement, visible range, render window, anchors

paper
  -> paper/page geometry model

selection
  -> structural selection, text target, caret target, hit-test result

draft
  -> active text-block island, IME, local buffer, fallback input

commands
  -> canExecute, reason, command intent shaping

mutations
  -> queue, commit bridge, rejection handling, latest-only apply

layout
  -> live/exact layout status and reconciliation

diagnostics
  -> read-only issue/status/debug view

React components
  -> render views and dispatch intent only
```

No single file may own all of these responsibilities.

## Ownership Rule

A module may coordinate behavior, but it must not become the owner of unrelated responsibilities.

A file should not own more than one of these categories unless it is a thin coordinator:

```txt
state shape
derived indexes
event binding
command policy
core adapter calls
mutation application
viewport measurement
rendering
diagnostics
draft input
layout reconciliation
```

If a file starts owning multiple categories, split it before adding more behavior.

## Runtime Layers

The frontend runtime is split into these layers:

```txt
app shell layer
  -> app boot and high-level composition

core adapter layer
  -> core access boundary

editor runtime layer
  -> normalized editor view and runtime cache

interaction runtime layer
  -> selection, hit testing, draft, IME, command readiness

viewport runtime layer
  -> scroll, measurement, render window, anchors

visual render layer
  -> React components and canvas/page/node rendering

mutation/layout layer
  -> commit bridge, packet apply, live/exact status

diagnostics layer
  -> read-only diagnostics and recovery visibility
```

## App Shell Ownership

Recommended files:

```txt
src/app/EditorApp.tsx
src/app/EditorShell.tsx
```

Owns:

```txt
application boot
top-level composition
initial loading state
wiring runtime stores to components
placing shell regions
routing high-level intents to runtime modules
```

Must not own:

```txt
core operation semantics
normalized editor indexes
viewport measurement details
selection rules
draft/IME behavior
command policy
mutation queue semantics
layout reconciliation
diagnostics derivation
```

Allowed pattern:

```txt
EditorShell
  -> reads runtime view model
  -> passes props to panels
  -> dispatches intent to runtime/controller
```

Blocked pattern:

```txt
EditorShell
  -> imports core directly
  -> mutates package
  -> computes node indexes
  -> owns scroll measurements
  -> owns selection
  -> owns draft buffer
  -> owns command policy
  -> applies mutation packets
  -> renders all panels manually
```

## Core Adapter Ownership

Recommended files:

```txt
src/core/coreAdapter.ts
src/core/coreTypes.ts
src/core/fixtureLoader.ts
src/core/coreBoundaryChecks.ts
```

Owns:

```txt
all imports from @flowdoc/vnext-core
package parsing/loading adapter
core-to-editor seed conversion
core diagnostics summary conversion
core operation/transaction call boundary
core result normalization
```

Must not own:

```txt
React state
DOM state
viewport scroll
selection object
draft buffer
IME composition state
component rendering
user-facing command policy
```

Rules:

```txt
Only src/core/* may import @flowdoc/vnext-core.
UI components must not import @flowdoc/vnext-core directly.
Core adapter should expose editor-safe functions, not raw unlimited core access.
```

## Core Binding Ownership

Recommended files:

```txt
src/editor/coreBinding/coreEnvelope.ts
src/editor/coreBinding/readModel.ts
src/editor/coreBinding/capabilityMirror.ts
src/editor/coreBinding/renderProjectionSummary.ts
src/editor/coreBinding/revisionGuards.ts
src/editor/coreBinding/workingSetFactory.ts
src/editor/coreBinding/workingSetTypes.ts
```

Owns:

```txt
FrontendCoreWorkingSet
core snapshot envelope
read model construction from adapter-safe seed
command capability mirror from read model
render projection summary metadata
revision/sourceRevision stale guards
```

Must not own:

```txt
canonical package object
React rendering
DOM state
selection state
viewport state
draft buffer
mutation queue execution
backend request/session state
artifact bytes
```

Rules:

```txt
working set is read-only core-derived runtime projection
all derived caches must be revision-aligned
stale derived results must be blocked before applying
```

## Editor View Ownership

Recommended files:

```txt
src/editor/runtime/editorView.ts
src/editor/runtime/editorState.ts
```

Owns normalized indexes:

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

Owns selectors:

```txt
getNodeById
getParentId
getChildren
getSelectedNodeFacts
getOutlineItems
getInspectorFacts
getRenderableNodeSummary
```

Must not own:

```txt
DOM measurement
scrollTop
caret DOM range
IME composition
core mutation execution
layout engine behavior
React rendering
```

Rules:

```txt
interaction paths must use indexes/selectors
do not recursively walk the whole tree during click/select/inspector reads
canonical package is not mutated by editorView
editorView is derived runtime state, not persisted package truth
```

## Runtime Cache Ownership

Recommended files:

```txt
src/editor/runtime/runtimeCache.ts
src/editor/runtime/packetApply.ts
src/editor/runtime/revisionGuards.ts
```

Owns:

```txt
current editor runtime cache
document revision marker
last applied packet id
packet application rules
stale packet rejection
changed id sets
dirty id sets
selection preservation across unrelated packet updates
```

Must not own:

```txt
command policy
core operation execution
DOM events
React component state as source of truth
viewport measurement
draft buffer
```

Rules:

```txt
apply only bounded packets
reject stale packets
never apply older mutation result over newer local state
keep packet application independent from rendering
```

## Paper Ownership

Recommended files:

```txt
src/editor/paper/paperModel.ts
src/editor/paper/paperGeometry.ts
```

Owns:

```txt
paper preset
page width
page height
page margin
zoom scale input/output
page gap
page bounding boxes
document scroll height derived from page model
page coordinate helpers
```

Must not own:

```txt
text wrapping truth
page break truth
table row height truth
DOM scroll state
node rendering
selection state
```

Rules:

```txt
paper geometry may define canvas/paper shell dimensions
paper geometry must not become layout truth for document content
paper model must remain stable under zoom/scroll
```

## Viewport Ownership

Recommended files:

```txt
src/editor/viewport/viewportState.ts
src/editor/viewport/viewportMeasurement.ts
src/editor/viewport/renderWindow.ts
src/editor/viewport/scrollAnchor.ts
```

Owns:

```txt
canvas scroll container facts
scrollTop read state
viewport bounds
page shell measurement
visible range request
render window
overscan
scroll anchor
anchor restore for explicit jumps
```

Must not own:

```txt
selected node truth
draft input
core mutation
document layout truth
diagnostics panel layout
toolbar sticky layout
```

Rules:

```txt
scroll event must not rerender the whole app
scroll event may read measurement
scroll event must not write scrollTop back during normal user scroll
anchor restore only runs for explicit jump commands
viewport changes must not rewrite selection
render window changes must preserve selection
```

## Selection Ownership

Recommended files:

```txt
src/editor/selection/selectionState.ts
src/editor/selection/hitTest.ts
src/editor/selection/keyboardNavigation.ts
```

Owns:

```txt
selected node id
selected structural target
selected text target placeholder
caret target placeholder
hit-test result
keyboard navigation target
selection reason
selection revision
```

Must not own:

```txt
scrollTop
viewport measurement
draft text buffer
IME composition
core document mutation
inspector rendering
```

Rules:

```txt
selection is browser-local runtime state
selection is not persisted into canonical package
scroll measurement must not change selection by itself
hit-test must map from canvas/page coordinate to page/node/target
text selection inside active text island remains draft/input-owned when active
```

Selection categories:

```txt
structural selection
  -> node/block/table/cell

text target
  -> future caret/range target before active island opens

draft text selection
  -> owned by draft runtime while active

diagnostic target
  -> issue jump target

viewport anchor
  -> scroll restoration target
```

These categories must not be collapsed into one ambiguous field.

## Draft/Input Ownership

Recommended files:

```txt
src/editor/draft/activeTextBlockIsland.ts
src/editor/draft/draftBuffer.ts
src/editor/draft/imePolicy.ts
src/editor/draft/textareaFallback.ts
src/editor/draft/contenteditableBinding.ts
```

Owns:

```txt
active text-block id
active draft buffer
browser-local selection/range inside active island
IME composition state
composition guards
textarea fallback buffer
contenteditable binding facts when enabled
commit-ready draft facts
```

Must not own:

```txt
canonical package mutation
final layout truth
global selection outside active island
viewport scroll state
toolbar command policy beyond draft-local facts
```

Rules:

```txt
only one active text-block island at a time
do not commit while IME composition is active
do not make contenteditable innerHTML document truth
unsafe inline structures must guard, reject, or fallback
draft state is browser-local until commit boundary
rejected commit must not destroy newer local draft
```

Accepted input direction:

```txt
Hybrid Managed Cards + one Active Text-Block Island
```

Blocked before gate:

```txt
full-document contenteditable
rich editor framework
silent flattening of field chips
silent flattening of rich inline runs
```

## Command Policy Ownership

Recommended files:

```txt
src/editor/commands/commandPolicy.ts
src/editor/commands/textCommands.ts
src/editor/commands/richInlineCommands.ts
src/editor/commands/fieldChipCommands.ts
src/editor/commands/structuralCommands.ts
src/editor/commands/tableCommands.ts
```

Owns:

```txt
canExecute(command, target)
disabled reason
command target resolution
safe command intent shaping
fallback decision
rejection reason
command group naming
```

Must not own:

```txt
core operation implementation
React rendering
DOM event binding details
mutation queue application
layout reconciliation
```

Rules:

```txt
all commands must have canExecute and reason
unsupported target must reject with actionable reason
field chips must be atomic
table commands must be table-aware
draft/IME active state must be respected
```

Blocked:

```txt
button directly mutates document
keyboard shortcut bypasses command policy
toolbar enables unsupported command silently
field chip becomes plain text without explicit policy
```

## Mutation Ownership

Recommended files:

```txt
src/editor/mutations/mutationQueue.ts
src/editor/mutations/commitBridge.ts
src/editor/mutations/rejectionRecovery.ts
```

Owns:

```txt
pending mutation queue
commit request shaping
call into coreAdapter for mutation
latest-only apply guard
stale result rejection
rejection recovery
optimistic marker placeholder
mutation result summaries
```

Must not own:

```txt
React rendering
DOM selection object
viewport measurement
core operation internals
diagnostics presentation
```

Rules:

```txt
UI dispatches intent
command policy validates intent
mutation bridge commits through coreAdapter
runtime cache applies accepted packet/result
rejected result is surfaced safely
older response must not overwrite newer draft/runtime state
```

Mutation flow:

```txt
user event
  -> command policy
  -> mutation queue
  -> commit bridge
  -> coreAdapter
  -> core operation/transaction
  -> result/packet/dirty scope
  -> runtimeCache apply
  -> layout status update
  -> UI render update
```

Blocked:

```txt
UI component mutates canonical package directly
contenteditable HTML becomes package truth
mutation result applies without revision guard
```

## Layout Status Ownership

Recommended files:

```txt
src/editor/layout/liveLayoutClient.ts
src/editor/layout/layoutStatus.ts
src/editor/layout/layoutReconcile.ts
```

Owns:

```txt
live layout status
exact layout status
dirty layout scopes
layout request status
layout reconciliation summaries
stale/fresh markers
blocked/deferred reasons
```

Must not own:

```txt
final layout engine implementation
PDF/DOCX artifact generation
DOM measurement as canonical layout truth
selection or draft truth
```

Rules:

```txt
live layout may be viewport-first and dirty-scope based
live layout must not claim export readiness
exact layout may remain deferred
layout status should be visible to user/debug UI
accepted mutations mark layout stale when appropriate
```

Status vocabulary guideline:

```txt
liveLayoutStatus:
  fresh | stale | updating | blocked | unknown

exactLayoutStatus:
  fresh | stale | deferred | blocked | unknown
```

## Diagnostics Ownership

Recommended files:

```txt
src/editor/diagnostics/diagnosticsState.ts
src/editor/diagnostics/diagnosticsNavigation.ts
```

Owns:

```txt
diagnostics summaries
debug read model
issue list view model
diagnostics panel open/closed state
diagnostics jump intent shaping
read-only runtime visibility
```

Must not own:

```txt
canvas geometry
scroll measurement truth
document mutation
core diagnostics rules
command policy
```

Rules:

```txt
diagnostics reads state
diagnostics does not own state
diagnostics must not reflow canvas
diagnostics must not change scroll geometry
diagnostics jump uses explicit viewport anchor command
diagnostics must be disable-safe
```

## React Component Ownership

Recommended component folders:

```txt
src/components/shell/
src/components/toolbar/
src/components/canvas/
src/components/paper/
src/components/nodes/
src/components/outline/
src/components/inspector/
src/components/diagnostics/
src/components/status/
```

Owns:

```txt
rendering props
visual layout
event dispatch
accessibility labels
local purely visual UI state when safe
```

Must not own:

```txt
canonical package mutation
core operation calls
normalized index construction
viewport measurement rules
selection business rules
draft commit rules
mutation queue
layout truth
```

Rules:

```txt
components receive view models
components dispatch intents
components should not import @flowdoc/vnext-core
components should not mutate canonical package objects
components should not compute runtime indexes
```

Allowed local UI state examples:

```txt
dropdown open/closed
hover display
local input focus style
resizable panel drag preview before committed to viewport module
```

Blocked local UI state examples:

```txt
document node objects as editable truth
selection truth duplicated outside selection runtime
scroll truth duplicated outside viewport runtime
draft buffer hidden inside TextBlock component
```

## Event Ownership

DOM/browser event binding should be close to the visual component, but behavior must route into runtime modules.

Allowed:

```txt
CanvasSurface handles pointer event
  -> calls hitTest
  -> dispatches select intent
```

Blocked:

```txt
CanvasSurface handles pointer event
  -> mutates package
  -> updates inspector state manually
  -> changes scroll anchor
  -> applies mutation packet
```

Keyboard shortcuts should route through command policy.

IME events should route through draft/IME policy.

Scroll events should route through viewport runtime.

## Store Strategy

Do not add a global state manager in the first scaffold.

Use simple TypeScript modules and React state at shell boundaries until ownership is proven.

A state manager may be reconsidered later only if it improves ownership boundaries rather than hiding them.

If added later, it must not collapse all runtime state into one unstructured global store.

## Runtime State Categories

The frontend may keep these runtime states:

```txt
editor boot/load state
normalized view state
runtime cache/revision state
selection state
viewport state
paper view state
render window state
draft/input state
command readiness state
mutation queue state
layout status state
diagnostics display state
```

Each category should have a clear owner module.

## Persistence Rule

These states must not be persisted into the canonical package:

```txt
selection
caret target
IME composition
draft buffer before commit
scrollTop
viewport measurement
render window
hover
focus
diagnostics panel open/closed
local command menu state
```

Only committed document changes should flow into canonical package truth through core contracts.

## First Slice Ownership

The first scaffold may implement only minimal placeholders.

Scope:

```txt
app shell
core adapter placeholder
editor view placeholder
selection placeholder
viewport placeholder
diagnostics placeholder
CSS shell
basic components
```

Do not implement yet:

```txt
real WYSIWYG draft runtime
contenteditable binding
real mutation queue
real layout reconciliation
virtualization
Playwright browser probes
backend API integration
artifact rendering
```

Even placeholders should live in the intended ownership folders.

## PASS

- Runtime responsibilities are split by owner.
- React components render and dispatch intent only.
- `coreAdapter` is the only core import boundary.
- `editorView` owns normalized indexes.
- `viewport` owns scroll/measurement/render window.
- `selection` owns selection and hit-test state.
- `draft` owns active text-block island state when implemented.
- `commands` owns command readiness and rejection reasons.
- `mutations` owns commit queue and latest-only guards.
- `layout` owns live/exact status and reconciliation.
- `diagnostics` reads state without changing canvas geometry.
- No monolithic editor shell owns everything.

## FAIL / BLOCKER

Block implementation if any of these occur:

- `EditorShell` imports core directly.
- React components import `@flowdoc/vnext-core` directly.
- A single file owns state, render, event binding, command policy, mutation, diagnostics, and viewport.
- Selection state is stored inside viewport state.
- Draft buffer is hidden inside a text component without draft runtime ownership.
- Scroll events rerender the whole app.
- UI components mutate canonical package objects directly.
- Diagnostics changes canvas measurement or scroll geometry.
- Command execution bypasses command policy.
- Mutation results apply without revision/latest-only guard.
- Contenteditable HTML becomes document truth.

## RISK

- Early scaffolding can look harmless while creating ownership debt.
- React component state can become runtime truth by accident.
- `EditorShell` can become the new monolith.
- Viewport and selection can become coupled through scroll anchoring.
- Diagnostics can accidentally reflow canvas.
- Draft/input state can be implemented too early and bypass command/mutation rules.
- A broad global store can hide ownership problems rather than solving them.
- Core adapter can become an unreviewed pass-through for all core exports.

## UNKNOWN

- Whether a state manager will be useful after runtime boundaries are proven.
- Whether live layout runs in browser, backend, or hybrid in the first product slice.
- Exact packet shape needed by runtime cache.
- Exact hit-test metadata needed for text fragments.
- How much diagnostics state should be user-facing versus debug-only.
- Whether paper/canvas geometry needs worker/off-main-thread support later.
- Whether command policy should be split further by node family after tables/rich inline expand.

## Implementation Gate

Before moving beyond scaffold, verify:

```txt
No direct core import outside src/core/
No monolithic EditorShell ownership
No UI direct package mutation
No whole-app render loop
No scroll event whole-app rerender
No selection/viewport state collapse
No draft/contenteditable implementation before gate
No command execution bypassing commandPolicy
```

Suggested review questions for every phase:

```txt
1. Which module owns the new behavior?
2. Which module coordinates it?
3. Did any file gain unrelated responsibility?
4. Can the behavior be tested without rendering the whole shell?
5. Does the behavior keep core truth, browser runtime truth, layout truth, and artifact truth separate?
6. Does this add state that should be persisted? If not, where is it kept?
7. Can this module be replaced without rewriting transport, rendering, and core contracts together?
```

## Codex Handoff

Implement this boundary as documentation and scaffold placeholders only.

Scope:

```txt
- add docs/RUNTIME_OWNERSHIP.md
- create intended runtime folders if scaffold is being implemented
- add placeholder modules with ownership comments if useful
- keep EditorShell thin
- ensure components do not import core directly
```

Do not implement:

```txt
- WYSIWYG
- contenteditable
- real mutation queue
- real layout reconciliation
- virtualization
- Playwright
- backend API integration
- artifact generation
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
