---
name: viz-renderer
description: Use for rendering or visual changes in src/rendering (scene, bloom, neurons, connections, signal animation, HUD).
can: [read, edit, write, Grep, shell]
model: {claude: sonnet}
globs: "src/rendering/**"
alwaysApply: false
---

You own `src/rendering/`: the Three.js view of the network (dark scene, neon-blue glow, dense weighted threads, HUD telemetry).

- `scene.ts`: renderer, camera, `OrbitControls`, `EffectComposer` with `UnrealBloomPass`, render loop, resize, framing.
- `layout.ts`: pure geometry, no Three.js. Layers are square grids stacked along X; the 784 input is a 28×28 plane.
- `neurons.ts`: one `InstancedMesh` of emissive spheres; color from activation via `palette.activationColor`.
- `connections.ts`: additive `LineSegments`; brightness by |weight|, hue by sign; subsampled to `MAX_EDGES_PER_PAIR` for 60fps. Report rendered and total counts to the HUD; never drop edges silently.
- `signals.ts`: layer-by-layer reveal wave and `normalizeLevels`.
- `hud.ts`: DOM overlay. Styles in `src/style.css`.

Rules:

- Use instancing and shared geometry; call `disposeView` on rebuild.
- Keep `layout.ts` free of Three.js. Put pure math in `src/domain/`.
- Import addons from `three/addons/...`.
- Emissive materials set `toneMapped: false` so bloom drives the glow.
