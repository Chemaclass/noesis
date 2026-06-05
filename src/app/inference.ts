import { predict } from '../domain/network';
import type { TForwardTrace, TNetwork } from '../domain/types';

/** Softmax probability distribution over the output layer. */
export function softmaxOutputs(trace: TForwardTrace): number[] {
  const out = trace.layers[trace.layers.length - 1]?.a ?? [];
  const max = Math.max(...out, 0);
  const exps = out.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum > 0 ? exps.map((e) => e / sum) : exps.map(() => 0);
}

/** Softmax confidence of the winning output neuron. */
export function confidenceOf(trace: TForwardTrace): number {
  return softmaxOutputs(trace)[predict(trace)] ?? 0;
}

export type TLayerStat = {
  readonly label: string;
  readonly count: number;
  readonly activation: string;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
};

function stats(values: readonly number[]): { min: number; max: number; mean: number } {
  if (values.length === 0) return { min: 0, max: 0, mean: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, mean: sum / values.length };
}

/** Per-layer live activation stats for the info panel. */
export function layerStats(
  network: TNetwork,
  trace: TForwardTrace,
  labels: readonly string[],
): TLayerStat[] {
  const sizes = [network.inputSize, ...network.layers.map((l) => l.size)];
  const acts: readonly (readonly number[])[] = [trace.input, ...trace.layers.map((l) => l.a)];
  const activations = ['input', ...network.layers.map((l) => l.activation)];
  return labels.map((label, i) => {
    const s = stats(acts[i] ?? []);
    return {
      label,
      count: sizes[i] ?? 0,
      activation: activations[i] ?? '—',
      min: s.min,
      max: s.max,
      mean: s.mean,
    };
  });
}
