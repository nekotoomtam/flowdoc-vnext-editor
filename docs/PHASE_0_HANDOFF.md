# Phase 0 Handoff

Status: accepted Phase 0 baseline and completed scaffold handoff.

## Purpose

This handoff starts the first implementation slice for the FlowDoc vNext product editor frontend repository.

The goal is to scaffold a new, separate frontend repository with the correct stack, boundaries, and first runtime shape.

This phase must not implement WYSIWYG.

This phase must not migrate the lab UI.

This phase must not add product editing behavior beyond the initial shell and runtime placeholders.

## Target Repository

Create a new repository:

```txt
flowdoc-vnext-editor
```

Expected sibling layout during local development:

```txt
flowdoc-vnext-core/
flowdoc-vnext-editor/
```

The frontend repository consumes core through:

```json
{
  "dependencies": {
    "@flowdoc/vnext-core": "file:../flowdoc-vnext-core"
  }
}
```

## Required Reading

Before implementation, read these documents:

```txt
docs/STACK_DECISION.md
docs/CORE_CONTRACT_BOUNDARY.md
docs/LAB_BOUNDARY_DECISION.md
docs/RUNTIME_OWNERSHIP.md
docs/PRODUCT_EDITOR_PLAN.md
```

If any of these documents are missing, create them first from the accepted plan before continuing implementation.

For the active read-only core binding phase, also read:

```txt
docs/CORE_READ_BINDING_WORKING_SET.md
```

## Phase Scope

Implement only:

```txt
Phase 0: Repo + Boundary Docs
Phase 1: New Editor Entry
Phase 1.5: Core Adapter + Normalized Editor View placeholder
```

Do not implement later phases.

## Stack

Use:

```txt
Vite + React + TypeScript
npm
Plain CSS / CSS variables / CSS Modules where useful
Vitest
```

Do not add:

```txt
Next.js
Tailwind
UI component kit
ProseMirror
Slate
TipTap
Playwright
state manager library
full-document contenteditable
```

Playwright is deferred until scroll/click/viewport browser gates need it.

## Node Policy

Add:

```txt
.nvmrc
```

Content:

```txt
24
```

`package.json` must include:

```json
{
  "engines": {
    "node": ">=20.19.0"
  }
}
```

## Vite Entrypoint

Use root `index.html`.

Do not use `public/editor.html` as the Vite app entry.

Expected entry shape:

```txt
index.html
src/main.tsx
src/app/EditorApp.tsx
src/app/EditorShell.tsx
```

## Required Initial Repository Shape

Create this initial shape:

```txt
flowdoc-vnext-editor/
  AGENTS.md

  docs/
    STACK_DECISION.md
    CORE_CONTRACT_BOUNDARY.md
    LAB_BOUNDARY_DECISION.md
    RUNTIME_OWNERSHIP.md
    PRODUCT_EDITOR_PLAN.md
    PHASE_0_HANDOFF.md

  .nvmrc
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  vitest.config.ts

  src/
    main.tsx

    app/
      EditorApp.tsx
      EditorShell.tsx

    core/
      coreAdapter.ts
      coreTypes.ts
      fixtureLoader.ts
      coreBoundaryChecks.ts

    editor/
      runtime/
        editorState.ts
        editorView.ts
        runtimeCache.ts

      viewport/
        viewportState.ts
        viewportMeasurement.ts
        renderWindow.ts
        scrollAnchor.ts

      paper/
        paperModel.ts
        paperGeometry.ts

      selection/
        selectionState.ts
        hitTest.ts

      commands/
        commandPolicy.ts

      mutations/
        mutationQueue.ts
        commitBridge.ts
        rejectionRecovery.ts

      layout/
        layoutStatus.ts
        layoutReconcile.ts

      diagnostics/
        diagnosticsState.ts
        diagnosticsNavigation.ts

    components/
      shell/
        AppHeader.tsx
        EditorToolbar.tsx
        StatusBar.tsx

      canvas/
        CanvasSurface.tsx
        CanvasScrollRoot.tsx

      paper/
        PaperPage.tsx

      outline/
        OutlinePanel.tsx

      inspector/
        InspectorPanel.tsx

      diagnostics/
        DiagnosticsPanel.tsx

    styles/
      tokens.css
      app.css
      editor.css

    tests/
      smoke.test.ts
```

If implementation prefers fewer placeholder files, that is acceptable only if the ownership folders are still established and documented. Do not collapse everything into `EditorShell.tsx`.

## Package Scripts

Use these scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 4001",
    "build": "vite build",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "check": "npm run type-check && npm run test && npm run build"
  }
}
```

## Dependencies

Runtime dependencies:

```txt
@flowdoc/vnext-core
@vitejs/plugin-react
react
react-dom
```

Development dependencies:

```txt
typescript
vite
vitest
@types/node
@types/react
@types/react-dom
```

## AGENTS.md

Add `AGENTS.md` with this working agreement:

```md
# FlowDoc vNext Editor Working Agreement

This repository is the product editor frontend for FlowDoc vNext.

Default role:
- implementation reviewer
- scope guard
- frontend runtime boundary reviewer
- regression/risk reviewer

Core rules:
1. Use `@flowdoc/vnext-core` only through `src/core/coreAdapter.ts`.
2. Do not import `../flowdoc-vnext-core/src/**`.
3. Do not import or copy the lab/debug render loop.
4. Do not import `examples/template-builder-sandbox/public/app.js`.
5. Do not use whole-app `innerHTML` rerender as editor architecture.
6. Keep `EditorShell` thin.
7. Split by behavior ownership before adding more behavior.
8. Do not start WYSIWYG before the WYSIWYG gate.
9. Do not add ProseMirror, Slate, TipTap, Tailwind, UI kits, or Playwright in Phase 0.
10. React components render state and dispatch intent; runtime modules own behavior.

Required review output:
- PASS
- FAIL / BLOCKER
- RISK
- UNKNOWN
- files changed
- behavior changed
- tests run
- risks left
- intentionally not changed
```

## Core Adapter Placeholder

Create:

```txt
src/core/coreAdapter.ts
```

Purpose:

```txt
single frontend boundary to @flowdoc/vnext-core
```

Allowed in Phase 0:

```txt
placeholder function returning static editor seed
safe type-only import if needed
clear TODO for later real core integration
```

Blocked in Phase 0:

```txt
broad raw pass-through of all core exports
direct package mutation
layout execution
artifact generation
backend route behavior
```

Example shape:

```ts
export interface CoreEditorSeed {
  document: {
    id: string
    title: string
    packageVersion: number
    documentVersion: number
  }
  diagnostics: {
    graphIssueCount: number
    keyDataStatus: string
    generationStatus: string
    exactLayoutStatus: string
    artifactStatus: string
  }
  nodes: CoreEditorNodeSummary[]
}

export interface CoreEditorNodeSummary {
  id: string
  type: string
  label: string
  parentId: string | null
  childIds: string[]
}

export function loadInitialEditorSeed(): CoreEditorSeed {
  return {
    document: {
      id: "placeholder-document",
      title: "FlowDoc vNext Editor",
      packageVersion: 2,
      documentVersion: 3,
    },
    diagnostics: {
      graphIssueCount: 0,
      keyDataStatus: "unknown",
      generationStatus: "unknown",
      exactLayoutStatus: "unknown",
      artifactStatus: "unknown",
    },
    nodes: [
      {
        id: "root",
        type: "document",
        label: "Document",
        parentId: null,
        childIds: ["section-1"],
      },
      {
        id: "section-1",
        type: "section",
        label: "Section 1",
        parentId: "root",
        childIds: [],
      },
    ],
  }
}
```

Codex may adjust naming, but the adapter must remain narrow and editor-safe.

## Normalized Editor View Placeholder

Create:

```txt
src/editor/runtime/editorView.ts
```

Purpose:

```txt
derive lookup-first editor view from the core editor seed
```

Required placeholder indexes:

```txt
nodeById
parentById
childrenById
nodeOrder
textBlockIds
tableIds
visibleNodeIds
dirtyNodeIds
changedSubtreeIds
```

Required placeholder selectors:

```txt
getNodeById
getChildren
getOutlineItems
getInspectorFacts
```

Allowed:

```txt
build indexes from placeholder seed
render outline/canvas/inspector from same view
simple static nodes
```

Blocked:

```txt
recursive tree walking in active interaction path
canonical package mutation
real mutation bridge
real layout behavior
```

## Editor Shell Requirements

Create a basic shell with:

```txt
AppHeader
EditorToolbar
OutlinePanel
CanvasSurface
InspectorPanel
DiagnosticsPanel
StatusBar
```

Visual requirements:

```txt
app fills viewport
toolbar/header are outside canvas scroll root
canvas owns its own scroll container
body scroll is not the document canvas scroll
outline/canvas/inspector regions are visible
status bar is visible
```

Interaction requirements:

```txt
outline item click may update selected node placeholder
canvas placeholder may show selected node state
inspector reads selected node facts from editorView
diagnostics reads placeholder state
```

No document editing yet.

## CSS Requirements

Create:

```txt
src/styles/tokens.css
src/styles/app.css
src/styles/editor.css
```

Use CSS variables for:

```txt
background colors
surface colors
border colors
text colors
spacing
toolbar height
rail width
inspector width
status bar height
canvas background
paper background
```

Do not add Tailwind or a UI kit.

CSS must not make body scroll the document scroll.

## Tests

Add at least one Vitest placeholder test.

Recommended:

```txt
src/tests/smoke.test.ts
```

Test examples:

```txt
build normalized editor view from placeholder seed
getNodeById returns root
outline items are derived from same editor view
```

Do not add Playwright in this phase.

## Boundary Checks

Phase 0 must keep these true:

```txt
No direct @flowdoc/vnext-core imports outside src/core/
No import from ../flowdoc-vnext-core/src/**
No import from examples/template-builder-sandbox/public/app.js
No whole-app innerHTML render loop
No WYSIWYG framework
No contenteditable implementation
No Tailwind/UI kit
No backend storage/auth/artifact implementation
```

Suggested manual checks:

```sh
grep -R "@flowdoc/vnext-core" src
grep -R "../flowdoc-vnext-core/src" src || true
grep -R "template-builder-sandbox/public/app" src || true
grep -R "innerHTML" src || true
```

`@flowdoc/vnext-core` should appear only under `src/core/`.

Any `innerHTML` usage must be treated as suspicious and reviewed.

## Allowed Behavior Change

Phase 0 may introduce:

```txt
new frontend repo
new Vite app
new editor shell placeholder
new core adapter placeholder
new normalized editor view placeholder
new docs
new tests
```

## Blocked Behavior Change

Phase 0 must not introduce:

```txt
WYSIWYG
contenteditable
actual text editing
mutation bridge execution
layout execution
pagination execution
PDF/DOCX generation
backend API calls
storage/auth
virtualization
Playwright
rich editor framework
```

## First Slice Acceptance Criteria

The phase is accepted only when:

```txt
npm install succeeds
npm run type-check passes
npm run test passes
npm run build passes
npm run check passes
Vite app opens on port 4001
shell regions render
canvas scroll root exists
core adapter placeholder exists
normalized editor view placeholder exists
outline/canvas/inspector read from same view
docs are present
boundary checks pass
```

## Review Questions

Codex must answer:

```txt
1. Which module owns the new behavior?
2. Which module only coordinates it?
3. Did any file gain unrelated responsibility?
4. Can the behavior be tested without rendering the whole shell?
5. Does this keep core truth, browser runtime truth, layout truth, and artifact truth separate?
6. Does this preserve the lab/product boundary?
7. Does this preserve normalized editor view as the active runtime direction?
8. Did anything start WYSIWYG early?
```

## Required Report Format

Codex must report:

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

## Expected PASS Example

```txt
PASS:
- Created the separate Vite + React + TypeScript frontend scaffold.
- Added boundary docs and Phase 0 handoff.
- Added root index.html entry.
- Added thin EditorShell with toolbar, outline, canvas, inspector, diagnostics, and status placeholders.
- Added coreAdapter placeholder.
- Added normalized editorView placeholder.
- Outline/canvas/inspector read from the same placeholder editor view.
- No lab UI import.
- No WYSIWYG/contenteditable.

FAIL / BLOCKER:
- None.

RISK:
- Core adapter is placeholder only.
- Editor view uses static seed only.
- Browser scroll/click behavior is not smoke-tested yet.

UNKNOWN:
- Final API/fixture loading path.
- Exact core browser-safe export subset.
- When Playwright should be introduced.

Files changed:
- list files

Behavior changed:
- New frontend repo scaffold only.

Tests run:
- npm run type-check
- npm run test
- npm run build
- npm run check

Risks left:
- Implement real core-backed seed later.
- Implement real paper/viewport in later phases.

Intentionally not changed:
- No WYSIWYG.
- No contenteditable.
- No mutation bridge.
- No virtualization.
- No backend/API integration.
```

## Final Instruction

Keep this phase small.

Do not make the editor useful yet.

Make the editor safe to grow.

The purpose of Phase 0 is to prevent architecture drift before real product behavior begins.
