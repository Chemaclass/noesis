import { useCallback, useMemo, useReducer, useState } from 'react';
import { forward, predict, withHiddenActivation } from '../domain/network';
import type { TActivationName, TForwardTrace, TNetwork } from '../domain/types';
import { loadTrainedNetwork, modelAccuracy, sampleDigit } from '../data/model';
import type { TTheme } from '../rendering/palette';
import { confidenceOf, layerStats, softmaxOutputs, type TLayerStat } from './inference';
import { INPUT_SIZE, LAYER_LABELS, nextSeed, randomNetwork } from './networks';

export type TMode = 'trained' | 'random';

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
  | { type: 'setActivation'; name: TActivationName };

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
      if (state.mode !== 'random') return state; // trained net is fixed to ReLU
      return run(
        state,
        {
          network: withHiddenActivation(state.network, action.name),
          input: state.input,
          hiddenActivation: action.name,
        },
        true,
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
  readonly toggleTheme: () => void;
};

/** The single application-state hook: session, theme, derived values, actions. */
export function useNoesis(): TNoesis {
  const [session, dispatch] = useReducer(reducer, undefined, initialSession);
  const [theme, setTheme] = useState<TTheme>(readTheme);
  const [edges, setEdgesState] = useState({ rendered: 0, total: 0 });

  const derived = useMemo<TDerived>(
    () => ({
      predicted: predict(session.trace),
      confidence: confidenceOf(session.trace),
      outputs: softmaxOutputs(session.trace),
      accuracy: modelAccuracy(),
      activationLocked: session.mode === 'trained',
      layers: layerStats(session.network, session.trace, LAYER_LABELS),
    }),
    [session.trace, session.network, session.mode],
  );

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
    edges,
    inputSize: INPUT_SIZE,
    setEdges,
    pickDigit: useCallback((digit) => dispatch({ type: 'pickDigit', digit }), []),
    draw: useCallback((input) => dispatch({ type: 'draw', input }), []),
    play: useCallback(() => dispatch({ type: 'play' }), []),
    step: useCallback(() => dispatch({ type: 'step' }), []),
    setBrain: useCallback((brain) => dispatch({ type: 'setBrain', brain }), []),
    reseed: useCallback(() => dispatch({ type: 'reseed' }), []),
    setActivation: useCallback((name) => dispatch({ type: 'setActivation', name }), []),
    toggleTheme,
  };
}
