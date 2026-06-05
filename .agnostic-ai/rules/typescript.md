---
name: typescript
description: TypeScript conventions — T-prefixed types, no any, strict null handling.
globs: "**/*.ts"
alwaysApply: true
---

Modern, strict TypeScript. The compiler runs `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `verbatimModuleSyntax`, and unused-symbol checks.

- **Type names start with `T`**: `TNetwork`, `TForwardTrace`, `TLayer`. Use `type`,
  never `interface`.
- **No `any`.** Use `unknown` + narrowing. **No non-null assertions (`!`).** Indexing
  returns `T | undefined` — handle it (`?? fallback`, guards, early return).
- **`import type`** for type-only imports (`verbatimModuleSyntax` enforces it).
- Prefer `readonly` data and pure functions over mutable classes; model state as
  immutable snapshots (e.g. `TForwardTrace`).
- Use `as const satisfies …` for registries (see `ACTIVATIONS`) so keys stay literal
  and exhaustive.
- Keep ESLint (type-checked rules) and `tsc --noEmit` green.
