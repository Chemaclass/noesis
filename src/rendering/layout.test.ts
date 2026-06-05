import { describe, expect, it } from 'vitest';
import { computeLayout, totalNeurons } from './layout';

describe('computeLayout', () => {
  it('produces one position per neuron in every layer', () => {
    const sizes = [9, 4, 2];
    const { positions } = computeLayout(sizes);
    expect(positions.map((l) => l.length)).toEqual(sizes);
  });

  it('gives every neuron a distinct position', () => {
    const sizes = [784, 32, 10];
    const { positions } = computeLayout(sizes);
    const seen = new Set<string>();
    for (const layer of positions) {
      for (const [x, y, z] of layer) seen.add(`${x},${y},${z}`);
    }
    expect(seen.size).toBe(totalNeurons(sizes));
  });

  it('stacks layers along x, centered on origin', () => {
    const { positions } = computeLayout([1, 1, 1], { layerGap: 10, neuronGap: 1 });
    expect(positions[0]?.[0]?.[0]).toBe(-10);
    expect(positions[1]?.[0]?.[0]).toBe(0);
    expect(positions[2]?.[0]?.[0]).toBe(10);
  });
});
