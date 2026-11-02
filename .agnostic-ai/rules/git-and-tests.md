---
name: git-and-tests
description: Commit format and Vitest workflow.
globs: "**/*"
alwaysApply: true
---

Commits: Conventional Commits with types `feat`, `fix`, `ref` (not `refactor`), `docs`, `test`, `chore`, `build`, `ci`. Imperative subject, about 50 characters. Body only when the why is not obvious. Never mention AI tools.

Tests:

- Vitest, co-located as `*.test.ts` beside the unit.
- Tests for `src/domain/` and `layout.ts` are DOM-free and run in Node.
- Add or extend tests for every engine or layout change: known activation outputs, hand-computed forward passes, distinct neuron positions.

Before a PR: `npm run typecheck && npm run lint && npm test && npm run build`.
