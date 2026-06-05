import { trainStep, type TSample } from '../domain/backprop';
import { createNetwork } from '../domain/network';
import type { TNetwork } from '../domain/types';
import { sampleDigit } from '../data/model';
import { INPUT_SIZE } from './networks';

/** Layer labels for the small net we train live (smaller than the showcase net). */
export const TRAIN_LABELS = ['Input 28×28', 'Hidden #1', 'Output 0–9'] as const;

/** A compact `784 → 24 → 10` net — small enough to learn visibly in the browser. */
export function buildTrainingNetwork(seed: number): TNetwork {
  return createNetwork({
    inputSize: INPUT_SIZE,
    seed,
    layers: [
      { size: 24, activation: 'relu' },
      { size: 10, activation: 'linear' },
    ],
  });
}

/** The bundled training set: one real MNIST example per digit 0–9. */
export function trainingSamples(): TSample[] {
  return Array.from({ length: 10 }, (_, d) => ({ input: sampleDigit(d), label: d }));
}

/** Outcome of advancing the trainer: where it stands now. */
export type TTrainResult = {
  readonly loss: number;
  readonly accuracy: number;
  readonly step: number;
};

/**
 * Stateful gradient-descent driver. Holds the live network and the fixed dataset;
 * each `advance()` runs one or more full-batch steps and mutates `network` to the
 * new snapshot. The math itself is pure (`domain/backprop`); this is orchestration.
 */
export class Trainer {
  network: TNetwork;
  step = 0;
  private readonly samples: TSample[];

  constructor(seed: number) {
    this.network = buildTrainingNetwork(seed);
    this.samples = trainingSamples();
  }

  /** Run `iters` full-batch descent steps at `learningRate`; return new metrics. */
  advance(learningRate: number, iters: number): TTrainResult {
    let loss = 0;
    let accuracy = 0;
    for (let k = 0; k < iters; k++) {
      const r = trainStep(this.network, this.samples, learningRate);
      this.network = r.network;
      loss = r.loss;
      accuracy = r.accuracy;
      this.step++;
    }
    return { loss, accuracy, step: this.step };
  }

  /** The training input for digit `d` — used to show a live forward pass. */
  inputFor(d: number): number[] {
    return this.samples[d % 10]?.input.slice() ?? new Array<number>(INPUT_SIZE).fill(0);
  }
}
