---
name: architecture
description: Engine/visualization layering — the engine must stay pure and testable.
globs: "src/**"
alwaysApply: true
---

noesis is a feedforward neural-network simulator with a Three.js visualization.
Respect the layering:

- **`src/core/` is the pure engine.** Zero runtime dependencies. Never import
  Three.js, never touch the DOM, `window`, or `document`. It is the testable
  "brain": activations, layers, forward pass, RNG, network construction.
- **`src/viz/` is the rendering layer.** It may depend on `src/core/`, never the
  reverse. Three.js lives only here.
- **`src/viz/layout.ts` stays pure** (no Three.js import) so neuron positioning is
  unit-testable. Don't add rendering imports to it.
- **`src/data/` holds inputs** (digit rasterization). Browser-only code is fine
  here, but keep it out of `src/core/`.

When adding a feature, put math in `core`, geometry in `layout`, and rendering in
`viz`. If you find yourself importing Three.js into `core`, the design is wrong.
