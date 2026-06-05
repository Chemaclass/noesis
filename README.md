# noesis

> _noesis_ (Greek νόησις) — the act of intellect; pure understanding.

A 3D, real-time **simulation of an AI "brain"**: a feedforward neural network you
can watch think. Pick a digit, and a signal sweeps layer by layer through a
glowing field of neurons and weighted connections — cyberpunk on the outside,
honest little neural net on the inside.

**▶ Live demo: <https://chemaclass.github.io/noesis/>**

![status](https://img.shields.io/badge/status-learning--toy-blue)

## What it does

- A fully-connected network: `28×28 input → 64 → 32 → 10 outputs (0–9)`.
- **Real digit recognition**: ships a model trained on MNIST (AdamW + light affine
  augmentation) to **~98% test accuracy**, robust to hand-drawn input. Pick a digit
  or **draw your own** — it actually classifies it.
- **Forward inference** rendered in 3D with [Three.js](https://threejs.org/) +
  bloom glow: neurons fire, connections glow by weight, the predicted digit lights up.
- A collapsible **info panel** (how-it-works, live layer stats, legend, the math).
- **Light / dark theme** toggle (persisted).
- Compare against an **untrained** brain, step or play the signal wave.

## Quick start

```bash
npm install
npm run dev      # open the printed localhost URL
```

Then: click a digit `0–9` or **✎ Draw** one, hit **▶ Play**, and watch the brain
recognize it.

## Train the model

The bundled `src/data/model.json` is generated offline — it downloads MNIST and
trains the MLP with AdamW, minibatches and light affine augmentation (no
dependencies, pure Node):

```bash
npm run train    # ~100s; rewrites src/data/model.json + 10 sample digits
```

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                   |
| `npm run build`     | Type-check + production build              |
| `npm test`          | Run the engine/layout unit tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit`                             |
| `npm run lint`      | ESLint (type-checked rules)               |

## How it's built

| Layer        | Where             | Notes                                                  |
| ------------ | ----------------- | ------------------------------------------------------ |
| Engine       | `src/core/`       | Pure TS, zero deps, no DOM — fully unit-testable.      |
| Layout       | `src/viz/layout.ts` | Pure geometry, no Three.js — testable.               |
| Rendering    | `src/viz/`        | Three.js: instanced neurons, line-field, bloom.        |
| HUD + panel  | `src/viz/hud.ts`, `panel.ts` | DOM overlays: controls + collapsible info panel. |
| Draw input   | `src/viz/draw.ts` | Paint a digit, MNIST-style preprocessing.              |
| Trained model| `src/data/model.ts`, `scripts/train.mjs` | Load / train the MNIST weights.       |

The engine never imports Three.js or touches the DOM, so the "brain" stays a
clean, testable library and the visualization is a thin layer on top.

## Roadmap

- In-browser training with a live loss/accuracy curve in the HUD.
- Per-neuron inspection (click a neuron to see its weights / receptive field).
- Decision-tree / symbolic mode.
- Save / load custom networks as JSON.

## Contributing

Contributions — human or agent — are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
