import './style.css';
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
  selectedDigit: number | null;
  network: TNetwork;
  trace: TForwardTrace;
};

function randomNetwork(seed: number, hidden: TActivationName): TNetwork {
  return createNetwork({
    inputSize: INPUT_SIZE,
    seed,
    // Heavy-tailed weights + bias noise: a few strong glowing threads and lively
    // neurons, so the untrained brain looks structured rather than a flat haze.
    tailPower: 2.4,
    biasNoise: 0.4,
    layers: [
      { size: 64, activation: hidden },
      { size: 32, activation: hidden },
      { size: 10, activation: 'linear' },
    ],
  });
}

/** Softmax probability distribution over the output layer. */
function softmaxOutputs(trace: TForwardTrace): number[] {
  const out = trace.layers[trace.layers.length - 1]?.a ?? [];
  const max = Math.max(...out, 0);
  const exps = out.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return sum > 0 ? exps.map((e) => e / sum) : exps.map(() => 0);
}

/** Softmax confidence of the winning output neuron. */
function confidenceOf(trace: TForwardTrace): number {
  return softmaxOutputs(trace)[predict(trace)] ?? 0;
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

  // Auto-collapse the info panel when both side panels won't comfortably fit.
  const narrow = window.matchMedia('(max-width: 1024px)');
  const applyNarrow = (): void => panel.setCollapsed(narrow.matches);
  applyNarrow();
  narrow.addEventListener('change', applyNarrow);

  const trained = loadTrainedNetwork();
  const state: TState = {
    mode: 'trained',
    seed: 1,
    hiddenActivation: 'relu',
    input: sampleDigit(3),
    selectedDigit: 3,
    network: trained,
    trace: forward(trained, sampleDigit(3)),
  };

  let edgesRendered = 0;
  let edgesTotal = 0;

  const drawPad = new DrawPad(document.body, (input) => {
    state.selectedDigit = null;
    runInput(input, true);
  });

  function selectTrained(): void {
    state.mode = 'trained';
    state.hiddenActivation = 'relu';
    rebuild(loadTrainedNetwork());
    runInput(state.input, true);
  }

  function selectRandom(): void {
    state.mode = 'random';
    state.seed = (state.seed * 1664525 + 1013904223) >>> 0;
    rebuild(randomNetwork(state.seed, state.hiddenActivation));
    runInput(state.input, true);
  }

  const hud = new Hud(hudRoot, {
    onDigit: (d) => {
      state.selectedDigit = d;
      runInput(sampleDigit(d), true);
    },
    onDraw: () => drawPad.toggle(),
    onPlay: () => runInput(state.input, true),
    onStep: () => runInput(state.input, false),
    onSelectBrain: (brain) => (brain === 'trained' ? selectTrained() : selectRandom()),
    onReseed: () => selectRandom(),
    onActivation: (name) => {
      if (state.mode === 'trained') return; // trained net is fixed to ReLU
      state.hiddenActivation = name;
      rebuild(withHiddenActivation(state.network, name));
      runInput(state.input, true);
    },
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
      activation: state.hiddenActivation,
      activationLocked: state.mode === 'trained',
      mode: state.mode,
      accuracy: MODEL_ACCURACY,
      edgesRendered,
      edgesTotal,
      predicted: predict(state.trace),
      confidence: confidenceOf(state.trace),
      outputs: softmaxOutputs(state.trace),
      selectedDigit: state.selectedDigit,
    };
    hud.update(hudState);
  }

  rebuild(state.network);
  scene.start();
  runInput(state.input, true);
}

main();
