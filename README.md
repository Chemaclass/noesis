# noesis

> _noesis_ (Greek νόησις) — the act of intellect; pure understanding.

A 3D, real-time **simulation of an AI "brain"**: a feedforward neural network you
can watch think. Pick a digit, and a signal sweeps layer by layer through a
glowing field of neurons and weighted connections — cyberpunk on the outside,
honest little neural net on the inside.

**▶ Live demo: <https://chemaclass.github.io/noesis/>**

![status](https://img.shields.io/badge/status-learning--toy-blue)

## What it does

- A fully-connected network: `28×28 input → hidden → hidden → 10 outputs (0–9)`.
- **Forward inference** rendered in 3D with [Three.js](https://threejs.org/) +
  bloom glow: neurons fire, connections glow by weight, the predicted digit lights up.
- Toggle the activation function, randomize the weights, step or play the signal wave.

> v1 is **inference only** — weights are random (the visualization is the point,
> not accuracy). Training / backprop is the headline item on the roadmap.

## Quick start

```bash
npm install
npm run dev      # open the printed localhost URL
```

Then: click a digit `0–9`, hit **▶ Play**, and watch the brain light up.

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
| HUD          | `src/viz/hud.ts`  | Plain DOM overlay (telemetry + controls).              |

The engine never imports Three.js or touches the DOM, so the "brain" stays a
clean, testable library and the visualization is a thin layer on top.

## Roadmap

- Backpropagation + live training on an MNIST subset (accuracy climbing in the HUD).
- Draw-your-own digit input.
- Decision-tree / symbolic mode.
- Save / load networks as JSON.

## Contributing

Contributions — human or agent — are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
