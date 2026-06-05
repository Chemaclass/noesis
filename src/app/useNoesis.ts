import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { forward, predict, withHiddenActivation } from '../domain/network';
import type { TActivationName, TForwardTrace, TNetwork } from '../domain/types';
import { loadTrainedNetwork, modelAccuracy, sampleDigit } from '../data/model';
import type { TTheme } from '../rendering/palette';
import { confidenceOf, layerStats, softmaxOutputs, type TLayerStat } from './inference';
import { INPUT_SIZE, LAYER_LABELS, nextSeed, randomNetwork } from './networks';
import { TRAIN_LABELS, Trainer } from './training';

export type TMode = 'trained' | 'random' | 'training';

/** Everything the scene + UI derive from. `nonce` bumps on every run. */
type TSession = {
  readonly mode: TMode;
  readonly seed: number;
  readonly hiddenActivation: TActivationName;
  readonly input: number[];
  readonly selectedDigit: number | null;
  readonly network: TNetwork;
  readonly trace: TForwardTrace;
  readonly animate: boolean;
  readonly nonce: number;
};

type TAction =
  | { type: 'pickDigit'; digit: number }
  | { type: 'draw'; input: number[] }
  | { type: 'play' }
  | { type: 'step' }
  | { type: 'setBrain'; brain: TMode }
  | { type: 'reseed' }
  | { type: 'setActivation'; name: TActivationName }
  | {
      type: 'setView';
      network: TNetwork;
      input: number[];
      mode: TMode;
      selectedDigit: number | null;
      animate: boolean;
      hiddenActivation?: TActivationName;
    };

/** Produce the next session: recompute the trace and bump the run nonce. */
function run(
  prev: TSession,
  patch: Partial<TSession> & { network: TNetwork; input: number[] },
  animate: boolean,
): TSession {
  return {
    ...prev,
    ...patch,
    trace: forward(patch.network, patch.input),
    animate,
    nonce: prev.nonce + 1,
  };
}

function reducer(state: TSession, action: TAction): TSession {
  switch (action.type) {
    case 'pickDigit':
      return run(
        state,
        { network: state.network, input: sampleDigit(action.digit), selectedDigit: action.digit },
        true,
      );
    case 'draw':
      return run(state, { network: state.network, input: action.input, selectedDigit: null }, true);
    case 'play':
      return run(state, { network: state.network, input: state.input }, true);
    case 'step':
      return run(state, { network: state.network, input: state.input }, false);
    case 'setBrain':
      if (action.brain === 'trained') {
        return run(
          state,
          {
            network: loadTrainedNetwork(),
            input: state.input,
            mode: 'trained',
            hiddenActivation: 'relu',
          },
          true,
        );
      }
      return reduceReseed(state);
    case 'reseed':
      return reduceReseed(state);
    case 'setActivation':
      if (state.mode !== 'random') return state; // trained + training nets are fixed
      return run(
        state,
        {
          network: withHiddenActivation(state.network, action.name),
          input: state.input,
          hiddenActivation: action.name,
        },
        true,
      );
    case 'setView':
      return run(
        state,
        {
          network: action.network,
          input: action.input,
          mode: action.mode,
          selectedDigit: action.selectedDigit,
          ...(action.hiddenActivation ? { hiddenActivation: action.hiddenActivation } : {}),
        },
        action.animate,
      );
    default:
      return state;
  }
}

function reduceReseed(state: TSession): TSession {
  const seed = nextSeed(state.seed);
  return run(
    state,
    { network: randomNetwork(seed, state.hiddenActivation), input: state.input, mode: 'random', seed },
    true,
  );
}

function initialSession(): TSession {
  const network = loadTrainedNetwork();
  const input = sampleDigit(3);
  return {
    mode: 'trained',
    seed: 1,
    hiddenActivation: 'relu',
    input,
    selectedDigit: 3,
    network,
    trace: forward(network, input),
    animate: true,
    nonce: 0,
  };
}

const THEME_KEY = 'noesis-theme';
function readTheme(): TTheme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

/** Live training metrics, surfaced to the UI (loss curve, accuracy, step count). */
export type TTraining = {
  readonly running: boolean;
  readonly step: number;
  readonly learningRate: number;
  readonly loss: readonly number[];
  readonly accuracy: number;
};

export type TDerived = {
  readonly predicted: number;
  readonly confidence: number;
  readonly outputs: number[];
  readonly accuracy: number;
  readonly activationLocked: boolean;
  readonly layers: TLayerStat[];
};

export type TNoesis = {
  readonly session: TSession;
  readonly theme: TTheme;
  readonly derived: TDerived;
  readonly training: TTraining;
  readonly edges: { rendered: number; total: number };
  readonly inputSize: number;
  readonly setEdges: (rendered: number, total: number) => void;
  readonly pickDigit: (digit: number) => void;
  readonly draw: (input: number[]) => void;
  readonly play: () => void;
  readonly step: () => void;
  readonly setBrain: (brain: TMode) => void;
  readonly reseed: () => void;
  readonly setActivation: (name: TActivationName) => void;
  readonly startTraining: () => void;
  readonly toggleTraining: () => void;
  readonly resetTraining: () => void;
  readonly setLearningRate: (lr: number) => void;
  readonly toggleTheme: () => void;
};

/** Steps of gradient descent per UI tick, and how often a tick fires (ms). */
const ITERS_PER_TICK = 2;
const TICK_MS = 120;
const LOSS_HISTORY = 120;
const DEFAULT_LR = 0.3;

/** The single application-state hook: session, theme, derived values, actions. */
export function useNoesis(): TNoesis {
  const [session, dispatch] = useReducer(reducer, undefined, initialSession);
  const [theme, setTheme] = useState<TTheme>(readTheme);
  const [edges, setEdgesState] = useState({ rendered: 0, total: 0 });
  const trainerRef = useRef<Trainer | null>(null);
  const seedRef = useRef(1);
  const [training, setTraining] = useState<TTraining>({
    running: false,
    step: 0,
    learningRate: DEFAULT_LR,
    loss: [],
    accuracy: 0,
  });

  const derived = useMemo<TDerived>(() => {
    const labels = session.mode === 'training' ? TRAIN_LABELS : LAYER_LABELS;
    return {
      predicted: predict(session.trace),
      confidence: confidenceOf(session.trace),
      outputs: softmaxOutputs(session.trace),
      accuracy: modelAccuracy(),
      activationLocked: session.mode !== 'random',
      layers: layerStats(session.network, session.trace, labels),
    };
  }, [session.trace, session.network, session.mode]);

  // The training loop: while running, descend the gradient a few steps per tick
  // and push the new weights into the scene (without reframing the camera).
  useEffect(() => {
    if (session.mode !== 'training' || !training.running) return;
    const id = setInterval(() => {
      const trainer = trainerRef.current;
      if (!trainer) return;
      const { loss, accuracy, step } = trainer.advance(training.learningRate, ITERS_PER_TICK);
      const digit = step % 10;
      dispatch({
        type: 'setView',
        network: trainer.network,
        input: trainer.inputFor(digit),
        mode: 'training',
        selectedDigit: digit,
        animate: false,
      });
      setTraining((s) => ({
        ...s,
        step,
        accuracy,
        loss: [...s.loss, loss].slice(-LOSS_HISTORY),
        // Stop on its own once it has memorised all ten — the overfitting beat.
        running: accuracy >= 1 ? false : s.running,
      }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [session.mode, training.running, training.learningRate]);

  const startTraining = useCallback(() => {
    seedRef.current = nextSeed(seedRef.current);
    const trainer = new Trainer(seedRef.current);
    trainerRef.current = trainer;
    setTraining({ running: true, step: 0, learningRate: DEFAULT_LR, loss: [], accuracy: 0 });
    dispatch({
      type: 'setView',
      network: trainer.network,
      input: trainer.inputFor(0),
      mode: 'training',
      selectedDigit: 0,
      animate: true,
      hiddenActivation: 'relu',
    });
  }, []);

  const toggleTraining = useCallback(() => {
    setTraining((s) => ({ ...s, running: !s.running }));
  }, []);

  const resetTraining = useCallback(() => startTraining(), [startTraining]);

  const setLearningRate = useCallback((lr: number) => {
    setTraining((s) => ({ ...s, learningRate: lr }));
  }, []);

  const setBrain = useCallback((brain: TMode) => {
    setTraining((s) => ({ ...s, running: false }));
    trainerRef.current = null;
    dispatch({ type: 'setBrain', brain });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: TTheme = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const setEdges = useCallback((rendered: number, total: number) => {
    setEdgesState({ rendered, total });
  }, []);

  return {
    session,
    theme,
    derived,
    training,
    edges,
    inputSize: INPUT_SIZE,
    setEdges,
    pickDigit: useCallback((digit) => dispatch({ type: 'pickDigit', digit }), []),
    draw: useCallback((input) => dispatch({ type: 'draw', input }), []),
    play: useCallback(() => dispatch({ type: 'play' }), []),
    step: useCallback(() => dispatch({ type: 'step' }), []),
    setBrain,
    reseed: useCallback(() => dispatch({ type: 'reseed' }), []),
    setActivation: useCallback((name) => dispatch({ type: 'setActivation', name }), []),
    startTraining,
    toggleTraining,
    resetTraining,
    setLearningRate,
    toggleTheme,
  };
}
