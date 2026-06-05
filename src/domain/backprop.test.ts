import { describe, expect, it } from 'vitest';
import { computeGradients, crossEntropy, softmax, trainStep, type TSample } from './backprop';
import { createNetwork, forward, predict } from './network';
import type { TNetwork } from './types';

describe('softmax + cross-entropy', () => {
  it('softmax is uniform for equal logits and sums to 1', () => {
    const p = softmax([2, 2, 2, 2]);
    expect(p).toEqual([0.25, 0.25, 0.25, 0.25]);
  });

  it('cross-entropy is ~0 for a confident correct prediction', () => {
    expect(crossEntropy([0.999, 0.001], 0)).toBeCloseTo(0, 2);
    expect(crossEntropy([0.001, 0.999], 0)).toBeGreaterThan(5);
  });
});

describe('computeGradients', () => {
  it('output error equals softmax(probs) − one-hot(label)', () => {
    // A single linear layer with zero weights → logits [0,0] → probs [0.5,0.5].
    const network = {
      inputSize: 2,
      layers: [
        {
          size: 2,
          inputSize: 2,
          activation: 'linear',
          weights: [
            [0, 0],
            [0, 0],
          ],
          biases: [0, 0],
        },
      ],
    } as const satisfies TNetwork;

    const { grads, loss } = computeGradients(network, { input: [1, 0], label: 0 });
    expect(loss).toBeCloseTo(Math.log(2), 10); // −ln(0.5)
    const g = grads[0];
    // delta = [0.5−1, 0.5−0] = [−0.5, 0.5]; dW[j][i] = delta[j]·input[i].
    const flatW = g?.dW.flat() ?? [];
    [-0.5, 0, 0.5, 0].forEach((v, i) => expect(flatW[i]).toBeCloseTo(v, 10));
    [-0.5, 0.5].forEach((v, j) => expect(g?.db[j]).toBeCloseTo(v, 10));
  });
});

describe('trainStep', () => {
  it('drives loss down and learns a tiny 2-class problem', () => {
    const samples: TSample[] = [
      { input: [1, 0], label: 0 },
      { input: [0, 1], label: 1 },
    ];
    let net = createNetwork({
      inputSize: 2,
      seed: 7,
      layers: [
        { size: 4, activation: 'relu' },
        { size: 2, activation: 'linear' },
      ],
    });

    const first = trainStep(net, samples, 0.5).loss;
    for (let i = 0; i < 400; i++) net = trainStep(net, samples, 0.5).network;
    const last = trainStep(net, samples, 0.5).loss;

    expect(last).toBeLessThan(first);
    expect(predict(forward(net, [1, 0]))).toBe(0);
    expect(predict(forward(net, [0, 1]))).toBe(1);
  });
});
