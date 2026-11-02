---
name: architecture
description: Layering rules that keep the engine pure and testable.
globs: "src/**"
alwaysApply: true
---

Dependencies point inward: `ui -> app -> domain`.

- `src/domain/`: pure engine (activations, layers, forward pass, RNG, network construction). No runtime dependencies; never import React or Three.js, never touch the DOM.
- `src/app/`: framework-agnostic services (inference, networks, preprocessing) and the `useNoesis` hook. Depends on `domain`; from `rendering` only types.
- `src/rendering/`: imperative Three.js classes. May depend on `domain`, never the reverse. `layout.ts` stays free of Three.js.
- `src/ui/`: React components only. `SceneCanvas` bridges to the engine (useEffect and ref). No business logic: call the hook.
- `src/data/` and `public/model.json`: trained weights, loaded as a fetched asset.

Place new code: math in `domain`, state in `app`, geometry in `layout`, drawing in `rendering`, markup in `ui`.
