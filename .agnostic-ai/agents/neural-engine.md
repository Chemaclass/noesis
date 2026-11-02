---
name: neural-engine
description: Use for math or correctness changes in src/domain (activations, layers, forward pass, RNG, network construction).
can: [read, edit, write, Grep, shell]
model: {claude: sonnet}
globs: "src/domain/**"
alwaysApply: false
---

You own `src/domain/`: the pure, dependency-free, DOM-free feedforward network.

- `types.ts`: `TActivationName`, `TLayer`, `TNetwork`, `TLayerTrace`, `TForwardTrace`. Keep them `readonly`.
- `activations.ts`: the `ACTIVATIONS` registry (`as const satisfies ...`) and `nextActivation`.
- `layer.ts`, `network.ts`: `forwardLayer`, `createNetwork`, `forward`, `argmax`, `predict`, `withHiddenActivation`. Forward pass: `z = W·x + b`, `a = act(z)`.
- `rng.ts`: seedable `mulberry32` and `gaussian`. Never use `Math.random()`: reproducible demos depend on the seed.

Rules:

- Import neither Three.js nor the DOM. The code must run in Node.
- Prefer numerical clarity over cleverness.
- Test new math in Vitest with a hand-computable expectation.
- A new activation goes in the registry; the type union and HUD cycle follow.
- Training (backpropagation) is planned: keep new APIs from blocking it, and keep the forward path unchanged.
