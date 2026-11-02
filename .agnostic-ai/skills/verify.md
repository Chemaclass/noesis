---
name: verify
description: Use to run the full quality gate (typecheck, lint, tests, build) before a PR.
globs: "**/*"
alwaysApply: false
---

Run in order and report pass or fail for each:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

- All four must pass before a PR.
- For rendering changes also run `npm run dev`: pick a digit, press Play, confirm the signal wave and bloom.
- On failure, quote the error and fix the cause. Do not loosen `tsconfig` or disable lint rules.
