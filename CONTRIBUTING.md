# Contributing to noesis

Thanks for helping — whether you're a human or an AI agent. This guide keeps the
codebase coherent and the review loop fast.

## Golden rules

1. **Respect the layers.** Dependencies point inward: `ui → app → domain`.
   `src/domain/` (the engine) has **zero** runtime deps and never touches React,
   Three.js, or the DOM. `src/app/` holds services + the `useNoesis` hook.
   `src/rendering/` is the Three.js engine. `src/ui/` is React components only —
   no business logic, call the hook.
2. **Geometry is pure too.** `src/rendering/layout.ts` computes positions with no
   Three.js import, so it stays unit-testable. Keep it that way.
3. **Types start with `T`** (e.g. `TNetwork`, `TForwardTrace`) and we use `type`,
   never `interface`.
4. **No `any`, no non-null `!`.** `tsconfig` runs strict + `noUncheckedIndexedAccess`;
   handle `undefined` from indexing explicitly. Prefer `readonly` data and pure
   functions over mutable classes where reasonable.
5. **Conventional Commits.** `feat:`, `fix:`, `ref:` (we use `ref:` not
   `refactor:`), `docs:`, `test:`, `chore:`. Don't mention tooling/assistants in
   commit messages.

## Local workflow

```bash
npm install
npm run dev        # iterate visually
npm test           # engine + layout tests
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (type-checked)
```

Before opening a PR, all four must be green:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Where things live

| Path                     | Responsibility                                          |
| ------------------------ | ------------------------------------------------------- |
| `src/domain/`            | Network math: activations, layers, forward pass, RNG.   |
| `src/app/`               | Services (inference, networks, preprocessing) + `useNoesis` hook. |
| `src/rendering/layout.ts`| Pure 3D positioning of neurons.                         |
| `src/rendering/scene.ts` | Three.js renderer, camera, bloom, render loop.          |
| `src/rendering/{neurons,connections,signals}.ts` | Neuron/edge geometry + the wave animation. |
| `src/ui/`                | React components (`App`, `SceneCanvas`, panels, draw).  |
| `src/data/`, `public/model.json` | Trained-weight loading; `scripts/train.mjs` trains. |

## Adding things

- **New activation function?** Add it to `ACTIVATIONS` in
  `src/domain/activations.ts` (the union type `TActivationName` updates with it)
  and add a test. The activation dropdown picks it up automatically.
- **New visual feature?** Rendering in `src/rendering/`, state in `src/app/`,
  markup in `src/ui/`, math in `src/domain/`.
- **Always add/extend tests** for engine and layout changes — they run in Node
  without a browser, so keep new logic DOM-free where it belongs.

## Tests

Vitest. Co-locate tests as `*.test.ts` next to the unit under test. Engine and
layout tests must not require a DOM.

## AI agents

Agent configs are generated from a single source of truth in `.agnostic-ai/`
(via [agnostic-ai](https://github.com/Chemaclass/agnostic-ai), targets `claude` +
`codex`). The generated outputs — `.claude/`, `.codex/`, `CLAUDE.md`, `AGENTS.md` —
are **git-ignored**. After cloning, regenerate them:

```bash
agnostic-ai sync
```

If you change conventions, edit the source specs under `.agnostic-ai/` and re-run
`agnostic-ai sync` so every assistant stays in lockstep. Never edit the generated
files directly — they're overwritten on the next sync.
