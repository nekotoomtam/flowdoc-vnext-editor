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

Cross-repo coordination:
- Before backend/API transport, mutation packets, or core contract integration,
  read `../flowdoc-vnext-core/docs/CROSS_REPO_OPERATING_MAP.md`.
- Default integration flow is editor intent -> backend transport/revision gate
  -> `@flowdoc/vnext-core` semantics -> backend response envelope -> editor
  stale-gated runtime apply.
- Do not bypass the backend for service-owned mutation/persistence behavior
  unless the task is explicitly a browser-safe read-only core adapter slice.
- For broad delegated topics, follow the delegated major topic workflow in the
  cross-repo map: split into phases, execute until complete or blocked, then
  hand off with the required review output.

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
