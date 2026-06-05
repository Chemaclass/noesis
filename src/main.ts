import './style.css';
import { nextActivation } from './core/activations';
import { createNetwork, forward, predict, withHiddenActivation } from './core/network';
import type { TActivationName, TForwardTrace, TNetwork } from './core/types';
import { MODEL_ACCURACY, loadTrainedNetwork, sampleDigit } from './data/model';
import { DrawPad } from './viz/draw';
import { Hud, type THudState } from './viz/hud';
import { type TTheme, setPaletteTheme } from './viz/palette';
import { Panel, type TPanelLayer, type TPanelState } from './viz/panel';
import { Scene } from './viz/scene';

const THEME_KEY = 'noesis-theme';

function readTheme(): TTheme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

function applyThemeAttr(theme: TTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

const INPUT_SIZE = 784; // 28x28
const LAYER_LABELS = ['Input 28×28', 'Hidden #1', 'Hidden #2', 'Output 0–9'] as const;

/** Mutable app state. */
type TState = {
  mode: 'trained' | 'random';
  seed: number;
  hiddenActivation: TActivationName;
  input: number[];
  network: TNetwork;
  trace: TForwardTrace;
};

function randomNetwork(seed: number, hidden: TActivationName): TNetwork {
  return createNetwork({
    inputSize: INPUT_SIZE,
    seed,
    layers: [
      { size: 64, activation: hidden },
      { size: 32, activation: hidden },
      { size: 10, activation: 'linear' },
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

/** Min / mean / max of a vector, for the live panel. */
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

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const hudRoot = document.querySelector<HTMLElement>('#hud');
  const panelRoot = document.querySelector<HTMLElement>('#panel');
  if (!canvas || !hudRoot || !panelRoot) throw new Error('missing #scene / #hud / #panel');

  let theme = readTheme();
  applyThemeAttr(theme);
  setPaletteTheme(theme); // before Scene reads background/bloom from the palette

  const scene = new Scene(canvas);
  const panel = new Panel(panelRoot);

  const trained = loadTrainedNetwork();
  const state: TState = {
    mode: 'trained',
    seed: 1,
    hiddenActivation: 'relu',
    input: sampleDigit(3),
    network: trained,
    trace: forward(trained, sampleDigit(3)),
  };

  let edgesRendered = 0;
  let edgesTotal = 0;

  const drawPad = new DrawPad(hudRoot, (input) => runInput(input, true));

  const hud = new Hud(hudRoot, {
    onDigit: (d) => runInput(sampleDigit(d), true),
    onActivation: () => {
      if (state.mode === 'trained') return; // trained net is fixed to ReLU
      state.hiddenActivation = nextActivation(state.hiddenActivation);
      state.network = withHiddenActivation(state.network, state.hiddenActivation);
      scene.build(state.network); // weights unchanged, geometry same; recolor
      runInput(state.input, true);
    },
    onPlay: () => runInput(state.input, true),
    onStep: () => runInput(state.input, false),
    onTrained: () => {
      state.mode = 'trained';
      state.hiddenActivation = 'relu';
      rebuild(loadTrainedNetwork());
      runInput(state.input, true);
    },
    onRandomize: () => {
      state.mode = 'random';
      state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
      rebuild(randomNetwork(state.seed, state.hiddenActivation));
      runInput(state.input, true);
    },
    onDraw: () => drawPad.toggle(),
    onTheme: () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, theme);
      applyThemeAttr(theme);
      scene.setTheme(theme);
    },
  });

  function rebuild(network: TNetwork): void {
    state.network = network;
    const result = scene.build(network);
    edgesRendered = result.edges.rendered;
    edgesTotal = result.edges.total;
  }

  function runInput(input: number[], animate: boolean): void {
    state.input = input;
    state.trace = forward(state.network, input);
    if (animate) scene.play(state.trace);
    else scene.show(state.trace);
    refreshHud();
  }

  function refreshHud(): void {
    const sizes = [state.network.inputSize, ...state.network.layers.map((l) => l.size)];
    const acts: readonly (readonly number[])[] = [
      state.trace.input,
      ...state.trace.layers.map((l) => l.a),
    ];
    const activations = ['input', ...state.network.layers.map((l) => l.activation)];

    const panelLayers: TPanelLayer[] = LAYER_LABELS.map((label, i) => {
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

    const panelState: TPanelState = {
      layers: panelLayers,
      activation: state.hiddenActivation,
      accuracy: MODEL_ACCURACY,
      prediction: predict(state.trace),
      confidence: confidenceOf(state.trace),
    };
    panel.update(panelState);

    const hudState: THudState = {
      layerLabels: LAYER_LABELS,
      neuronCounts: sizes,
      activation: state.hiddenActivation,
      activationLocked: state.mode === 'trained',
      edgesRendered,
      edgesTotal,
      predicted: predict(state.trace),
      confidence: confidenceOf(state.trace),
    };
    hud.update(hudState);
  }

  rebuild(state.network);
  scene.start();
  runInput(state.input, true);
}

main();
