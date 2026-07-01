# Stack Decision

Status: accepted for the first product editor frontend repository.

## Purpose

This document locks the initial frontend stack for the FlowDoc vNext product editor.

The goal is to create a separate, long-lived frontend repository for the real product editor surface, not another lab/debug shell.

The stack decision must support:

- a browser-based document editor;
- typed editor runtime boundaries;
- stable shell/canvas/paper/viewport work;
- long-document behavior;
- later WYSIWYG through a guarded active text-block island;
- clean consumption of `@flowdoc/vnext-core`.

## Decision

Create a new repository:

```txt
flowdoc-vnext-editor
```

Use this initial stack:

```txt
Vite + React + TypeScript
npm
Plain CSS / CSS Modules + CSS variables
Vitest
Playwright later, only when browser scroll/click/viewport gates need it
```

Do not use yet:

```txt
Next.js
Tailwind
UI component kits
ProseMirror
Slate
TipTap
full-document contenteditable
```

## Why This Stack

### Vite

Vite is accepted because the editor needs fast local iteration, browser dev server behavior, HMR, and a simple frontend app boundary.

The editor is primarily a browser runtime surface. It does not need SSR or a full-stack framework at this stage.

### React

React is accepted as the UI/component layer for:

- app shell;
- toolbar;
- outline;
- canvas;
- paper/page renderer;
- inspector;
- diagnostics;
- status panels.

React must not become the owner of document truth, layout truth, command semantics, mutation rules, or browser input runtime all at once.

React components should render state and dispatch intent. Responsibility-specific runtime modules should own behavior.

### TypeScript

TypeScript is required because the editor needs explicit contracts for:

- core adapter inputs/outputs;
- normalized editor view;
- node lookup;
- selection state;
- viewport state;
- paper geometry;
- command readiness;
- mutation packets;
- diagnostics;
- layout status.

### npm

Use npm first to match the current core repository workflow.

Do not introduce package-manager complexity until the repository boundary and local development flow are stable.

### CSS variables / CSS Modules

Use plain CSS, CSS variables, and CSS Modules first.

Do not add Tailwind or a UI kit in the first phase.

The first frontend risk is not visual speed. The first frontend risk is unstable geometry, scroll behavior, render ownership, and runtime state boundaries.

### Vitest

Use Vitest for pure runtime tests:

- editor view indexes;
- selection model;
- viewport calculations;
- paper geometry;
- command policy;
- mutation packet guards.

### Playwright

Do not add Playwright in the first scaffold unless needed.

Add Playwright or browser smoke tests when the phase reaches:

- scroll stability;
- hit testing;
- viewport measurement;
- virtualization;
- fast scroll probes;
- click-after-scroll correctness.

## Node Version Policy

Local development may use Node 24.x.

Recommended repo file:

```txt
.nvmrc
```

```txt
24
```

`package.json` should declare the minimum Node version accepted by the current Vite requirement:

```json
{
  "engines": {
    "node": ">=20.19.0"
  }
}
```

The recommended local version is Node 24.x.

Server/CI may use Node 24.x, or another version that satisfies the installed Vite version requirement.

## Vite Entrypoint Rule

Do not put the main app entry HTML under `public/`.

Do not use:

```txt
public/editor.html
```

as the Vite app entry.

Use a root app entry:

```txt
index.html
```

Recommended first shape:

```txt
flowdoc-vnext-editor/
  index.html
  src/
    main.tsx
    app/
      EditorApp.tsx
      EditorShell.tsx
```

If a multi-page setup is needed later, use root-level HTML entries, not `public/` app entries:

```txt
flowdoc-vnext-editor/
  index.html
  editor.html
  src/
    main.tsx
    editorMain.tsx
```

For the first implementation slice, use single-page Vite entry with `index.html`.

## Core Dependency

During local development, keep the repositories side by side:

```txt
flowdoc-vnext-core/
flowdoc-vnext-editor/
```

Use a sibling file dependency:

```json
{
  "dependencies": {
    "@flowdoc/vnext-core": "file:../flowdoc-vnext-core"
  }
}
```

Consumer rules:

- Import `@flowdoc/vnext-core` only through the frontend core adapter.
- Do not import `../flowdoc-vnext-core/src/**`.
- Do not copy core files into the frontend repository.
- Do not copy the lab/debug UI runtime into the frontend repository.
- Keep frontend adapter code in this repository.
- Keep canonical document truth in core.

## Core Adapter Rule

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
src/components/**/*.tsx
  imports from @flowdoc/vnext-core
```

Blocked:

```txt
src/editor/**/*.ts
  imports from ../flowdoc-vnext-core/src/**
```

The adapter exists to keep core consumption deliberate and reviewable.

## Initial Repository Shape

Recommended first scaffold:

```txt
flowdoc-vnext-editor/
  AGENTS.md

  docs/
    STACK_DECISION.md
    CORE_CONTRACT_BOUNDARY.md
    LAB_BOUNDARY_DECISION.md
    PRODUCT_EDITOR_PLAN.md
    RUNTIME_OWNERSHIP.md

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

      diagnostics/
        diagnosticsState.ts

    components/
      shell/
      toolbar/
      canvas/
      paper/
      outline/
      inspector/
      diagnostics/
      status/

    styles/
      tokens.css
      app.css
      editor.css
```

This structure is intentionally larger than a normal Vite starter because the editor must not grow into one monolithic shell file.

## Scripts

Use these initial scripts:

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

## Initial Dependencies

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

Do not add these in the first slice:

```txt
@playwright/test
tailwindcss
prosemirror-*
slate
@tiptap/*
state manager libraries
UI kits
```

A state manager can be reconsidered later only after runtime ownership is clear.

## Frontend Role

The frontend owns browser interaction truth:

```txt
selection
caret target
IME state
draft buffer
viewport state
scroll state
hover/focus
overlay state
render window
diagnostics display state
```

The frontend does not own canonical document truth.

The frontend must not become a layout engine.

The frontend must not decide final page breaks, final text wrapping truth, or table row height truth.

## Backend Role

Backend/API/worker work remains outside this frontend repository.

Backend owns:

```txt
storage
auth/authz
durable save/checkpoint
publish/version
render API runtime
exact layout job
artifact job
PDF/DOCX byte generation
artifact pointer/status
```

Frontend may display backend statuses later, but must not implement backend durability or artifact truth in this repository.

## Rich Editor Framework Decision

Do not use ProseMirror, Slate, or TipTap at this stage.

Reason:

FlowDoc has its own document model, field chips, layout truth, pagination contracts, table rules, and renderer/export parity requirements.

Introducing a rich editor framework before the WYSIWYG gate risks importing a second document model and a second editing truth.

The accepted direction remains:

```txt
Hybrid Managed Cards + one Active Text-Block Island
```

WYSIWYG starts only after shell, paper, scroll, selection, render partition, virtualization, diagnostics, and command-policy gates are stable.

## PASS

- Vite + React + TypeScript is accepted as the frontend base.
- npm is accepted for the first repository workflow.
- CSS variables / CSS Modules are accepted before Tailwind or a UI kit.
- Vitest is accepted for pure runtime tests.
- Playwright is deferred until browser behavior needs evidence.
- Rich editor frameworks are blocked until WYSIWYG gate.
- The app entry must be root `index.html`, not `public/editor.html`.
- Core consumption must go through `src/core/coreAdapter.ts`.

## FAIL / BLOCKER

Block the implementation if any of these occur:

- New editor imports `examples/template-builder-sandbox/public/app.js`.
- New editor copies the lab render loop or whole-app rerender pattern.
- React components import `@flowdoc/vnext-core` directly.
- Frontend imports `../flowdoc-vnext-core/src/**`.
- Main Vite app entry is placed under `public/`.
- ProseMirror, Slate, TipTap, Tailwind, or a UI kit is added in the first slice.
- WYSIWYG/contenteditable work starts before the product editor gate.
- A single shell file starts owning state, rendering, event binding, command policy, mutation transport, diagnostics, and viewport behavior together.

## RISK

The biggest risk is not the chosen stack.

The biggest risk is recreating the old lab/editor shell shape inside React.

Other risks:

- React component state becomes the editor runtime truth.
- Scroll geometry becomes coupled to diagnostics or sticky UI.
- Core imports spread across UI components.
- The frontend starts implementing layout truth.
- CSS changes accidentally change paper/canvas measurement behavior.
- The sibling `file:` dependency works locally but later needs CI/package strategy.

## UNKNOWN

- Final server/CI Node version.
- Whether the first deployed frontend remains static-only or needs backend integration.
- When Playwright should be added.
- Whether the core package later needs browser/node/contract subpath exports.
- Whether a state manager is needed after runtime ownership is proven.
- Whether CSS Modules alone remain enough after the product editor surface grows.

## Implementation Gate

Before moving beyond the scaffold phase, verify:

```txt
node --version
npm --version
npm install
npm run type-check
npm run test
npm run build
npm run check
```

Required results:

```txt
Node version satisfies Vite requirement.
npm install succeeds.
type-check succeeds.
Vitest succeeds.
Vite build succeeds.
check succeeds.
```

Repository boundary checks:

```txt
No import from ../flowdoc-vnext-core/src/**
No direct core import inside React components
No import from lab/debug public/app.js
No whole-app innerHTML render loop
No WYSIWYG framework
No contenteditable implementation
No Tailwind/UI kit
```

## First Codex Handoff

Implement only the first stack scaffold.

Scope:

```txt
- create flowdoc-vnext-editor repo scaffold
- add Vite + React + TypeScript
- add .nvmrc
- add package scripts
- add docs/STACK_DECISION.md
- add src/core/coreAdapter.ts placeholder
- add src/app/EditorApp.tsx
- add src/app/EditorShell.tsx
- add basic shell placeholders
- add CSS variables/tokens
- add empty Vitest setup
```

Do not implement:

```txt
- WYSIWYG
- contenteditable
- mutation bridge
- real paper model
- virtualization
- Playwright
- Tailwind
- UI kit
- rich editor framework
- backend/API integration
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
