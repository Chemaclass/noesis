import type { TActivationFn, TActivationName } from './types';

/** Registry of activation functions, keyed by name. `as const` keeps keys literal. */
export const ACTIVATIONS = {
  sigmoid: (x: number): number => 1 / (1 + Math.exp(-x)),
  relu: (x: number): number => (x > 0 ? x : 0),
  tanh: (x: number): number => Math.tanh(x),
  linear: (x: number): number => x,
} as const satisfies Record<TActivationName, TActivationFn>;

/**
 * Derivative of each activation w.r.t. its pre-activation input `z` (the value
 * fed to the function), keyed by name. Used by backpropagation to turn an
 * upstream error into a per-neuron gradient.
 */
export const DERIVATIVES = {
  sigmoid: (z: number): number => {
    const s = 1 / (1 + Math.exp(-z));
    return s * (1 - s);
  },
  relu: (z: number): number => (z > 0 ? 1 : 0),
  tanh: (z: number): number => {
    const t = Math.tanh(z);
    return 1 - t * t;
  },
  linear: (): number => 1,
} as const satisfies Record<TActivationName, TActivationFn>;

/** Ordered list of names — used by the HUD to cycle through activations. */
export const ACTIVATION_NAMES = Object.keys(ACTIVATIONS) as TActivationName[];

export function activate(name: TActivationName, x: number): number {
  return ACTIVATIONS[name](x);
}

/** Slope of `name` at pre-activation `z` — the local gradient for backprop. */
export function activationDerivative(name: TActivationName, z: number): number {
  return DERIVATIVES[name](z);
}

/** Next activation in the cycle — wraps around. Drives the `[click]` HUD control. */
export function nextActivation(name: TActivationName): TActivationName {
  const i = ACTIVATION_NAMES.indexOf(name);
  return ACTIVATION_NAMES[(i + 1) % ACTIVATION_NAMES.length] ?? 'relu';
}
