# noesis

3D simulation of a feedforward neural network (MNIST digits, 28x28 -> 128 -> 64 -> 10) in React, TypeScript, Three.js and Vite.

- Dev: `npm run dev`. Retrain the model: `npm run train` (rewrites `src/data/model.json`).
- Gate before a PR: `npm run typecheck && npm run lint && npm test && npm run build`.
- Layer rules: the architecture rule. Workflow: `CONTRIBUTING.md`.
