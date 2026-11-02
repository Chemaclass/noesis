---
name: add-activation
description: Use to add a new activation function (for example leakyRelu) to the engine.
globs: "src/domain/**"
alwaysApply: false
---

1. Add the name to `TActivationName` in `src/domain/types.ts`.
2. Add the function to `ACTIVATIONS` in `src/domain/activations.ts`. The `satisfies Record<TActivationName, ...>` guard makes the compiler flag a missing one.
3. Add a case to `src/domain/activations.test.ts` with hand-computed values (at 0 and at a negative input).
4. Nothing else: `ACTIVATION_NAMES`, the HUD cycle (`nextActivation`) and the picker update themselves.

Keep it a pure scalar `(x: number) => number`. Confirm with `npm test && npm run typecheck`.
