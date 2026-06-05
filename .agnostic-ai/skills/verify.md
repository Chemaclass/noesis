---
name: verify
description: Run the full noesis quality gate — typecheck, lint, tests, and build — and report what passes or fails.
globs: "**/*"
alwaysApply: false
---

Run the project's full quality gate and report results concisely.

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # ESLint, type-checked rules
npm test            # Vitest: engine + layout (DOM-free)
npm run build       # tsc + vite production build
```

Guidance:

- Run them in this order; `typecheck` and `test` catch the most issues fastest.
- All four must be green before a PR.
- For a quick visual check of rendering changes, `npm run dev` and open the printed
  localhost URL: pick a digit, hit Play, confirm the signal wave and bloom render.
- If something fails, quote the exact error and fix the root cause — don't loosen
  `tsconfig` or disable lint rules to make it pass.
