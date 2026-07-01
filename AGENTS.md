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
