import { createNetwork } from '../domain/network';
import type { TActivationName, TNetwork } from '../domain/types';

export const INPUT_SIZE = 784; // 28x28
export const LAYER_LABELS = ['Input 28×28', 'Hidden #1', 'Hidden #2', 'Output 0–9'] as const;

/** Architecture mirrors the trained model so the viz is consistent across modes. */
export function randomNetwork(seed: number, hidden: TActivationName): TNetwork {
  return createNetwork({
    inputSize: INPUT_SIZE,
    seed,
    // Heavy-tailed weights + bias noise + gain: a structured, lively untrained
    // brain with dynamic (but wrong) output probabilities.
    tailPower: 2.4,
    biasNoise: 0.4,
    weightGain: 2.0,
    layers: [
      { size: 128, activation: hidden },
      { size: 64, activation: hidden },
      { size: 10, activation: 'linear' },
    ],
  });
}

/** Deterministic LCG step for reseeding the random brain. */
export function nextSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}
