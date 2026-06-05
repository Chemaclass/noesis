---
name: architecture
description: Engine/visualization layering — the engine must stay pure and testable.
globs: "src/**"
alwaysApply: true
---

noesis is a React + TypeScript app: a feedforward neural-network simulator with a
Three.js visualization. It is organized in layers; dependencies point inward
(`ui → app → domain`):

- **`src/domain/` is the pure engine.** Zero runtime dependencies. Never import
  React, Three.js, or touch the DOM. The testable "brain": activations, layers,
  forward pass, RNG, network construction.
- **`src/app/` is the application layer.** Framework-agnostic services (inference,
  networks, preprocessing) and the `useNoesis` React state hook. Depends on
  `domain`, never on `rendering` internals beyond types.
- **`src/rendering/` is the Three.js engine.** Imperative classes (Scene, Neurons,
  Connections, signals, palette). May depend on `domain`, never the reverse.
  **`src/rendering/layout.ts` stays pure** (no Three.js) so it's unit-testable.
- **`src/ui/` is presentation.** React components only. `SceneCanvas` is the bridge
  to the imperative engine (useEffect + ref). No business logic here — call the hook.
- **`src/data/` + `public/model.json`** load the trained weights (fetched asset).

When adding a feature: math in `domain`, orchestration/state in `app`, geometry in
`layout`, rendering in `rendering`, markup in `ui`. If `domain` ever imports React
or Three.js, the design is wrong.
