# noesis

3D real-time simulation of a feedforward neural network (MNIST digits, 28x28 -> 128 -> 64 -> 10), built with React, TypeScript, Three.js and Vite. Layers: `src/domain` (pure engine), `src/app`, `src/rendering`, `src/ui`.

- Dev: `npm run dev`. Build: `npm run build` (typecheck + vite build).
- Gate: `npm run typecheck && npm run lint && npm test && npm run build` (Vitest, ESLint).
- Retrain the model: `npm run train` (rewrites `src/data/model.json`).
- Dependencies point inward: `ui -> app -> domain`. See CONTRIBUTING.md.
