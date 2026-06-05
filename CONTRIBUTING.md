# Contributing to noesis

Thanks for helping — whether you're a human or an AI agent. This guide keeps the
codebase coherent and the review loop fast.

## Golden rules

1. **Keep the engine pure.** Code under `src/core/` must have **zero** runtime
   dependencies and never touch the DOM or Three.js. It's the testable "brain".
   Visualization (`src/viz/`) is a thin layer on top — it may depend on the
   engine, never the reverse.
2. **Geometry is pure too.** `src/viz/layout.ts` computes positions with no
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

| Path                  | Responsibility                                          |
| --------------------- | ------------------------------------------------------- |
| `src/core/`           | Network math: activations, layers, forward pass, RNG.   |
| `src/viz/layout.ts`   | Pure 3D positioning of neurons.                         |
| `src/viz/scene.ts`    | Three.js renderer, camera, bloom, render loop.          |
| `src/viz/neurons.ts`  | Instanced neuron spheres + per-neuron glow.             |
| `src/viz/connections.ts` | Weighted line-field between layers (subsampled).     |
| `src/viz/signals.ts`  | The layer-by-layer activation wave animation.           |
| `src/viz/hud.ts`      | DOM telemetry + controls overlay.                       |
| `src/data/digits.ts`  | 28×28 digit input rasterization.                        |

## Adding things

- **New activation function?** Add it to `ACTIVATIONS` in
  `src/core/activations.ts` (the union type `TActivationName` updates with it) and
  add a test. The HUD cycle picks it up automatically.
- **New visual feature?** Put rendering in `src/viz/`, keep any math in `src/core/`.
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
