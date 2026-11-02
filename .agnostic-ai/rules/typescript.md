---
name: typescript
description: TypeScript conventions.
globs: "**/*.ts"
alwaysApply: true
---

The compiler runs `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` and unused-symbol checks.

- Type names start with `T` (`TNetwork`). Use `type`, never `interface`.
- No `any` (use `unknown` and narrow). No `!`. Indexing returns `T | undefined`: handle it.
- Use `import type` for type-only imports.
- Prefer `readonly` data and pure functions; model state as immutable snapshots (`TForwardTrace`).
- Use `as const satisfies ...` for registries (`ACTIVATIONS`).
- Keep ESLint and `tsc --noEmit` green.
