---
name: add-activation
description: Add a new activation function to the neural-network engine end to end.
globs: "src/domain/**"
alwaysApply: false
---

Steps to add an activation function (e.g. `leakyRelu`) cleanly:

1. **Type** — add the name to the `TActivationName` union in `src/domain/types.ts`.
2. **Implementation** — add the function to the `ACTIVATIONS` registry in
   `src/domain/activations.ts`. The `as const satisfies Record<TActivationName, …>`
   guard makes the compiler enforce that every name has an implementation.
3. **Test** — add a case to `src/domain/activations.test.ts` with a hand-computed
   expectation (e.g. value at 0 and at a negative input).
4. **Nothing else needed** — `ACTIVATION_NAMES`, the HUD `[click]` cycle
   (`nextActivation`), and the activation picker pick it up automatically.

Keep functions pure scalar `(x: number) => number`. No side effects, no DOM.
Run `npm test && npm run typecheck` to confirm.
