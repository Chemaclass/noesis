import { forwardLayer } from './layer';
import { gaussian, mulberry32 } from './rng';
import type { TActivationName, TForwardTrace, TLayer, TNetwork } from './types';

/** Spec for one layer when building a network. */
export type TLayerSpec = {
  readonly size: number;
  readonly activation: TActivationName;
};

export type TNetworkSpec = {
  readonly inputSize: number;
  readonly layers: readonly TLayerSpec[];
  readonly seed?: number;
  /**
   * Tail heaviness of the weight distribution (sign-preserving power on a
   * Gaussian). 1 = plain He init (uniform-looking field). Higher values make a
   * few connections strong and most faint — a more structured, "interesting"
   * look for the untrained showcase. Default 1.
   */
  readonly tailPower?: number;
  /** Random bias spread, so neurons have varied baselines. Default 0. */
  readonly biasNoise?: number;
  /** Multiplier on weight scale. >1 spreads activations/logits so the output
   * distribution is peakier and varies per input. Default 1. */
  readonly weightGain?: number;
};

/** Sign-preserving power: keeps direction, reshapes magnitude. */
function signedPow(x: number, p: number): number {
  return Math.sign(x) * Math.pow(Math.abs(x), p);
}

/**
 * Build a fully-connected network with random (He-ish scaled) weights.
 * Deterministic given a seed. No training here — v1 is forward inference only.
 */
export function createNetwork(spec: TNetworkSpec): TNetwork {
  const rng = mulberry32(spec.seed ?? 1);
  const tail = spec.tailPower ?? 1;
  const biasNoise = spec.biasNoise ?? 0;
  const gain = spec.weightGain ?? 1;
  const layers: TLayer[] = [];
  let inputSize = spec.inputSize;

  for (const layerSpec of spec.layers) {
    const scale = Math.sqrt(2 / inputSize) * gain;
    const weights: number[][] = [];
    const biases: number[] = [];

    for (let j = 0; j < layerSpec.size; j++) {
      const row: number[] = new Array<number>(inputSize);
      for (let i = 0; i < inputSize; i++) row[i] = signedPow(gaussian(rng), tail) * scale;
      weights.push(row);
      biases.push(biasNoise ? gaussian(rng) * biasNoise : 0);
    }

    layers.push({
      size: layerSpec.size,
      inputSize,
      weights,
      biases,
      activation: layerSpec.activation,
    });
    inputSize = layerSpec.size;
  }

  return { inputSize: spec.inputSize, layers };
}

/** Run a full forward pass, capturing every layer's z and a. */
export function forward(network: TNetwork, input: readonly number[]): TForwardTrace {
  if (input.length !== network.inputSize) {
    throw new Error(`network expects input of size ${network.inputSize}, got ${input.length}`);
  }

  const traces = [];
  let current: readonly number[] = input;
  for (const layer of network.layers) {
    const trace = forwardLayer(current, layer);
    traces.push(trace);
    current = trace.a;
  }

  return { input, layers: traces };
}

/** Return a copy of the network with the activation of all hidden layers swapped. */
export function withHiddenActivation(network: TNetwork, activation: TActivationName): TNetwork {
  const last = network.layers.length - 1;
  return {
    inputSize: network.inputSize,
    layers: network.layers.map((layer, i) => (i === last ? layer : { ...layer, activation })),
  };
}

/** Index of the highest output-layer activation — the predicted class. */
export function argmax(values: readonly number[]): number {
  let best = 0;
  let bestVal = values[0] ?? -Infinity;
  for (let i = 1; i < values.length; i++) {
    const v = values[i] ?? -Infinity;
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

/** The network's prediction for an input: argmax over the final layer's activations. */
export function predict(trace: TForwardTrace): number {
  const last = trace.layers[trace.layers.length - 1];
  return last ? argmax(last.a) : -1;
}
