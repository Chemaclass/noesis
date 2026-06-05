import { activationDerivative } from './activations';
import { argmax, forward } from './network';
import type { TNetwork } from './types';

/**
 * Backpropagation — the learning half of the engine. Pure and DOM-free, like the
 * rest of `domain/`. The forward pass scores an input; backprop measures how
 * wrong it was and which direction every weight should move to be less wrong.
 *
 * Assumes the output layer holds raw logits (a `linear` final activation) fed
 * into softmax + cross-entropy. That combination makes the output error simply
 * `softmax(logits) − one-hot(label)`, the cleanest case to learn from.
 */

/** One labelled training example: a `784`-pixel input and its digit `0–9`. */
export type TSample = {
  readonly input: readonly number[];
  readonly label: number;
};

/** Per-layer gradients: `dW[l][j][i]` and `db[l][j]`. Same shape as the weights. */
export type TGradients = {
  readonly dW: number[][];
  readonly db: number[];
};

/** Softmax: turn raw logits into a probability distribution that sums to 1. */
export function softmax(logits: readonly number[]): number[] {
  const max = logits.length ? Math.max(...logits) : 0;
  const exps = logits.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum > 0 ? exps.map((e) => e / sum) : exps.map(() => 0);
}

/** Cross-entropy loss of a prediction against the true class — lower is better. */
export function crossEntropy(probs: readonly number[], label: number): number {
  return -Math.log((probs[label] ?? 0) + 1e-12);
}

/** Gradients of one example, plus its loss and predicted class. */
export type TExampleGradients = {
  readonly grads: readonly TGradients[];
  readonly loss: number;
  readonly predicted: number;
};

/**
 * Forward + backward for a single example. Returns the gradient of the loss
 * w.r.t. every weight and bias — the slope each parameter should descend.
 */
export function computeGradients(network: TNetwork, sample: TSample): TExampleGradients {
  const trace = forward(network, sample.input);
  const last = network.layers.length - 1;
  const probs = softmax(trace.layers[last]?.a ?? []);
  const loss = crossEntropy(probs, sample.label);

  // Error at the output layer's logits: softmax(probs) − one-hot(label).
  let delta = probs.map((p, k) => p - (k === sample.label ? 1 : 0));

  const grads: TGradients[] = new Array<TGradients>(network.layers.length);
  for (let l = last; l >= 0; l--) {
    const layer = network.layers[l];
    if (!layer) continue;
    // The inputs that fed this layer: the previous layer's activations (or the
    // network input for layer 0).
    const inputs = l === 0 ? sample.input : (trace.layers[l - 1]?.a ?? []);

    const dW: number[][] = new Array<number[]>(layer.size);
    const db: number[] = new Array<number>(layer.size);
    for (let j = 0; j < layer.size; j++) {
      const dj = delta[j] ?? 0;
      db[j] = dj;
      const row = new Array<number>(layer.inputSize);
      for (let i = 0; i < layer.inputSize; i++) row[i] = dj * (inputs[i] ?? 0);
      dW[j] = row;
    }
    grads[l] = { dW, db };

    // Propagate the error to the previous layer, through its activation slope.
    if (l > 0) {
      const prev = network.layers[l - 1];
      const prevZ = trace.layers[l - 1]?.z ?? [];
      const next = new Array<number>(layer.inputSize).fill(0);
      for (let j = 0; j < layer.size; j++) {
        const dj = delta[j] ?? 0;
        const w = layer.weights[j] ?? [];
        for (let i = 0; i < layer.inputSize; i++) next[i] = (next[i] ?? 0) + (w[i] ?? 0) * dj;
      }
      if (prev) {
        for (let i = 0; i < layer.inputSize; i++) {
          next[i] = (next[i] ?? 0) * activationDerivative(prev.activation, prevZ[i] ?? 0);
        }
      }
      delta = next;
    }
  }

  return { grads, loss, predicted: argmax(probs) };
}

/** A network plus how it did this step: average loss and batch accuracy. */
export type TTrainStep = {
  readonly network: TNetwork;
  readonly loss: number;
  readonly accuracy: number;
};

/**
 * One gradient-descent step over a minibatch: average the per-example gradients
 * and nudge every weight downhill by `learningRate`. Returns a brand-new network
 * (immutable snapshot) plus the batch's mean loss and accuracy.
 */
export function trainStep(
  network: TNetwork,
  batch: readonly TSample[],
  learningRate: number,
): TTrainStep {
  if (batch.length === 0) return { network, loss: 0, accuracy: 0 };

  // Accumulate summed gradients across the batch.
  const sumW = network.layers.map((l) => l.weights.map((row) => row.map(() => 0)));
  const sumB = network.layers.map((l) => l.biases.map(() => 0));
  let lossSum = 0;
  let correct = 0;

  for (const sample of batch) {
    const { grads, loss, predicted } = computeGradients(network, sample);
    lossSum += loss;
    if (predicted === sample.label) correct++;
    grads.forEach((g, l) => {
      const w = sumW[l];
      const b = sumB[l];
      if (!w || !b) return;
      g.dW.forEach((row, j) => {
        const wr = w[j];
        if (!wr) return;
        row.forEach((v, i) => (wr[i] = (wr[i] ?? 0) + v));
      });
      g.db.forEach((v, j) => (b[j] = (b[j] ?? 0) + v));
    });
  }

  const step = learningRate / batch.length;
  const layers = network.layers.map((layer, l) => ({
    ...layer,
    weights: layer.weights.map((row, j) =>
      row.map((w, i) => w - step * (sumW[l]?.[j]?.[i] ?? 0)),
    ),
    biases: layer.biases.map((b, j) => b - step * (sumB[l]?.[j] ?? 0)),
  }));

  return {
    network: { inputSize: network.inputSize, layers },
    loss: lossSum / batch.length,
    accuracy: correct / batch.length,
  };
}
