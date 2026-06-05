import './style.css';
import { nextActivation } from './core/activations';
import { createNetwork, forward, predict } from './core/network';
import type { TActivationName, TForwardTrace, TNetwork } from './core/types';
import { rasterizeDigit } from './data/digits';
import { Hud, type THudState } from './viz/hud';
import { Scene } from './viz/scene';

const INPUT_SIZE = 784; // 28x28
const LAYER_LABELS = ['Input 28×28', 'Hidden #1', 'Hidden #2', 'Output 0–9'] as const;

/** Mutable app state — small enough to keep as a plain object. */
type TState = {
  seed: number;
  hiddenActivation: TActivationName;
  digit: number;
  network: TNetwork;
  trace: TForwardTrace;
};

function buildNetwork(seed: number, hidden: TActivationName): TNetwork {
  return createNetwork({
    inputSize: INPUT_SIZE,
    seed,
    layers: [
      { size: 48, activation: hidden },
      { size: 24, activation: hidden },
      { size: 10, activation: 'sigmoid' },
    ],
  });
}

/** Softmax confidence of the winning output neuron. */
function confidenceOf(trace: TForwardTrace): number {
  const out = trace.layers[trace.layers.length - 1]?.a ?? [];
  const max = Math.max(...out, 0);
  let sum = 0;
  for (const v of out) sum += Math.exp(v - max);
  return sum > 0 ? Math.exp((out[predict(trace)] ?? 0) - max) / sum : 0;
}

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const hudRoot = document.querySelector<HTMLElement>('#hud');
  if (!canvas || !hudRoot) throw new Error('missing #scene or #hud in the DOM');

  const scene = new Scene(canvas);

  const network = buildNetwork(1, 'relu');
  const state: TState = {
    seed: 1,
    hiddenActivation: 'relu',
    digit: 3,
    network,
    trace: forward(network, rasterizeDigit(3)),
  };

  let edgesRendered = 0;
  let edgesTotal = 0;

  const hud = new Hud(hudRoot, {
    onDigit: (d) => runDigit(d, true),
    onActivation: () => {
      state.hiddenActivation = nextActivation(state.hiddenActivation);
      rebuild();
      runDigit(state.digit, true);
    },
    onPlay: () => runDigit(state.digit, true),
    onStep: () => runDigit(state.digit, false),
    onRandomize: () => {
      state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
      rebuild();
      runDigit(state.digit, true);
    },
  });

  function rebuild(): void {
    state.network = buildNetwork(state.seed, state.hiddenActivation);
    const result = scene.build(state.network);
    edgesRendered = result.edges.rendered;
    edgesTotal = result.edges.total;
  }

  function runDigit(digit: number, animate: boolean): void {
    state.digit = digit;
    state.trace = forward(state.network, rasterizeDigit(digit));
    if (animate) scene.play(state.trace);
    else scene.show(state.trace);
    refreshHud();
  }

  function refreshHud(): void {
    const hudState: THudState = {
      layerLabels: LAYER_LABELS,
      neuronCounts: [state.network.inputSize, ...state.network.layers.map((l) => l.size)],
      activation: state.hiddenActivation,
      edgesRendered,
      edgesTotal,
      predicted: predict(state.trace),
      confidence: confidenceOf(state.trace),
    };
    hud.update(hudState);
  }

  rebuild();
  scene.start();
  runDigit(state.digit, true);
}

main();
