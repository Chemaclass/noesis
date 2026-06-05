import { describe, expect, it } from 'vitest';
import { ACTIVATIONS, activate, nextActivation } from './activations';

describe('activations', () => {
  it('sigmoid(0) === 0.5', () => {
    expect(ACTIVATIONS.sigmoid(0)).toBe(0.5);
  });

  it('relu clamps negatives to 0', () => {
    expect(ACTIVATIONS.relu(-3)).toBe(0);
    expect(ACTIVATIONS.relu(2.5)).toBe(2.5);
  });

  it('tanh(0) === 0 and linear is identity', () => {
    expect(ACTIVATIONS.tanh(0)).toBe(0);
    expect(activate('linear', 42)).toBe(42);
  });

  it('nextActivation cycles and wraps', () => {
    expect(nextActivation('sigmoid')).toBe('relu');
    expect(nextActivation('linear')).toBe('sigmoid');
  });
});
