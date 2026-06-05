import { describe, expect, it } from 'vitest';
import { forwardLayer } from './layer';
import { argmax, createNetwork, forward, predict } from './network';
import type { TLayer } from './types';

describe('forward pass', () => {
  it('matches a hand-computed 2-2-1 network', () => {
    // Hidden layer: linear, identity-ish weights so we can compute by hand.
    const hidden: TLayer = {
      size: 2,
      inputSize: 2,
      weights: [
        [1, 0],
        [0, 1],
      ],
      biases: [1, -1],
      activation: 'linear',
    };
    // z = [1*1 + 0*2 + 1, 0*1 + 1*2 - 1] = [2, 1]
    const h = forwardLayer([1, 2], hidden);
    expect(h.a).toEqual([2, 1]);

    const out: TLayer = {
      size: 1,
      inputSize: 2,
      weights: [[1, 1]],
      biases: [0],
      activation: 'relu',
    };
    // z = 1*2 + 1*1 = 3 -> relu -> 3
    const o = forwardLayer(h.a, out);
    expect(o.a).toEqual([3]);
  });

  it('createNetwork is deterministic for a given seed', () => {
    const spec = { inputSize: 3, layers: [{ size: 4, activation: 'relu' as const }], seed: 7 };
    const a = forward(createNetwork(spec), [0.1, 0.2, 0.3]);
    const b = forward(createNetwork(spec), [0.1, 0.2, 0.3]);
    expect(a.layers).toEqual(b.layers);
  });

  it('argmax / predict pick the highest output', () => {
    expect(argmax([0.1, 0.9, 0.3])).toBe(1);
    expect(predict({ input: [], layers: [{ z: [], a: [0, 5, 2] }] })).toBe(1);
  });
});
