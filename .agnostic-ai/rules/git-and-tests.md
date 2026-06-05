---
name: git-and-tests
description: Conventional Commits and the Vitest testing workflow.
globs: "**/*"
alwaysApply: true
---

## Commits

Use **Conventional Commits**. Allowed types: `feat`, `fix`, `ref` (use `ref:`, not
`refactor:`), `docs`, `test`, `chore`, `build`, `ci`. Subject in imperative mood,
≤ ~50 chars. Body only when the "why" isn't obvious. Do not reference AI tooling
or assistants in commit messages.

## Tests

- Vitest. Co-locate tests as `*.test.ts` beside the unit under test.
- **Engine (`src/domain/`) and `layout.ts` tests must be DOM-free** — they run in
  plain Node.
- Add or extend tests for every engine/layout change. Cover the math (known
  activation outputs, hand-computed forward passes, distinct neuron positions).

## Before a PR, all green:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
