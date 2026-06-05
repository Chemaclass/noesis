/** Names of the supported activation functions. Discriminated union, not strings. */
export type TActivationName = 'sigmoid' | 'relu' | 'tanh' | 'linear';

/** A pure scalar activation function. */
export type TActivationFn = (x: number) => number;

/**
 * One fully-connected layer.
 *
 * `weights[j][i]` is the weight from input neuron `i` to this layer's neuron `j`.
 * `biases[j]` is the bias of neuron `j`. `size` is the neuron count (== biases.length).
 */
export type TLayer = {
  readonly size: number;
  readonly inputSize: number;
  readonly weights: readonly (readonly number[])[];
  readonly biases: readonly number[];
  readonly activation: TActivationName;
};

/** A feedforward network: an input width plus an ordered list of layers. */
export type TNetwork = {
  readonly inputSize: number;
  readonly layers: readonly TLayer[];
};

/** Snapshot of a single layer during a forward pass. Immutable. */
export type TLayerTrace = {
  /** Pre-activation values (weighted sum + bias) per neuron. */
  readonly z: readonly number[];
  /** Post-activation values per neuron. */
  readonly a: readonly number[];
};

/**
 * Full record of one forward pass: the input vector plus a trace per layer,
 * in order. The viz animates straight off this — engine never touches the DOM.
 */
export type TForwardTrace = {
  readonly input: readonly number[];
  readonly layers: readonly TLayerTrace[];
};
