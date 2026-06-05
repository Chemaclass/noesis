import { activate } from './activations';
import type { TLayer, TLayerTrace } from './types';

/**
 * Forward one layer: z = W·input + b, a = activation(z).
 * Returns both so the viz can show pre- and post-activation.
 * Throws on a width mismatch — a hard programming error, not a runtime guess.
 */
export function forwardLayer(input: readonly number[], layer: TLayer): TLayerTrace {
  if (input.length !== layer.inputSize) {
    throw new Error(`layer expects input of size ${layer.inputSize}, got ${input.length}`);
  }

  const z: number[] = new Array<number>(layer.size);
  const a: number[] = new Array<number>(layer.size);

  for (let j = 0; j < layer.size; j++) {
    const row = layer.weights[j] ?? [];
    const bias = layer.biases[j] ?? 0;
    let sum = bias;
    for (let i = 0; i < input.length; i++) {
      sum += (row[i] ?? 0) * (input[i] ?? 0);
    }
    z[j] = sum;
    a[j] = activate(layer.activation, sum);
  }

  return { z, a };
}
