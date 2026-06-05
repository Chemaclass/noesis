import type { TActivationFn, TActivationName } from './types';

/** Registry of activation functions, keyed by name. `as const` keeps keys literal. */
export const ACTIVATIONS = {
  sigmoid: (x: number): number => 1 / (1 + Math.exp(-x)),
  relu: (x: number): number => (x > 0 ? x : 0),
  tanh: (x: number): number => Math.tanh(x),
  linear: (x: number): number => x,
} as const satisfies Record<TActivationName, TActivationFn>;

/** Ordered list of names — used by the HUD to cycle through activations. */
export const ACTIVATION_NAMES = Object.keys(ACTIVATIONS) as TActivationName[];

export function activate(name: TActivationName, x: number): number {
  return ACTIVATIONS[name](x);
}

/** Next activation in the cycle — wraps around. Drives the `[click]` HUD control. */
export function nextActivation(name: TActivationName): TActivationName {
  const i = ACTIVATION_NAMES.indexOf(name);
  return ACTIVATION_NAMES[(i + 1) % ACTIVATION_NAMES.length] ?? 'relu';
}
