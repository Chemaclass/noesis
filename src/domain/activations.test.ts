import { describe, expect, it } from 'vitest';
import { ACTIVATIONS, activate, activationDerivative, nextActivation } from './activations';

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

  it('derivatives: relu step, sigmoid peak at 0, linear constant', () => {
    expect(activationDerivative('relu', 2)).toBe(1);
    expect(activationDerivative('relu', -2)).toBe(0);
    expect(activationDerivative('sigmoid', 0)).toBeCloseTo(0.25, 10);
    expect(activationDerivative('tanh', 0)).toBe(1);
    expect(activationDerivative('linear', 999)).toBe(1);
  });
});
