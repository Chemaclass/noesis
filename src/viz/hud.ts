import type { TActivationName } from '../core/types';

/** Human-friendly names for the activation functions. */
const ACTIVATION_LABEL: Record<TActivationName, string> = {
  relu: 'ReLU',
  sigmoid: 'Sigmoid',
  tanh: 'tanh',
  linear: 'Linear',
};

export type THudCallbacks = {
  readonly onDigit: (digit: number) => void;
  readonly onActivation: () => void;
  readonly onPlay: () => void;
  readonly onStep: () => void;
  readonly onRandomize: () => void;
  readonly onTrained: () => void;
  readonly onDraw: () => void;
  readonly onTheme: () => void;
};

export type THudState = {
  readonly layerLabels: readonly string[];
  readonly neuronCounts: readonly number[];
  readonly activation: TActivationName;
  readonly activationLocked: boolean;
  readonly mode: 'trained' | 'random';
  readonly accuracy: number;
  readonly edgesRendered: number;
  readonly edgesTotal: number;
  readonly predicted: number;
  readonly confidence: number;
};

/** Telemetry + controls overlay. Pure DOM, sits on top of the WebGL canvas. */
export class Hud {
  private readonly activationBtn: HTMLButtonElement;
  private readonly activationHint: HTMLElement;
  private readonly edges: HTMLElement;
  private readonly predicted: HTMLElement;
  private readonly confidence: HTMLElement;
  private readonly modeBadge: HTMLElement;

  constructor(root: HTMLElement, cb: THudCallbacks) {
    const modeWrap = el('div', 'hud-panel hud-mode');
    this.modeBadge = el('div', 'hud-mode-badge');
    modeWrap.appendChild(this.modeBadge);
    root.appendChild(modeWrap);

    const right = el('div', 'hud-panel hud-right');
    this.activationBtn = document.createElement('button');
    this.activationBtn.className = 'hud-btn hud-activation';
    this.activationBtn.addEventListener('click', cb.onActivation);
    this.activationHint = el('div', 'hud-hint');
    this.edges = el('div', 'hud-edges');
    right.append(this.activationBtn, this.activationHint, this.edges);
    root.appendChild(right);

    const readout = el('div', 'hud-panel hud-readout');
    this.predicted = el('div', 'hud-predicted');
    this.confidence = el('div', 'hud-confidence');
    readout.append(label('PREDICTION'), this.predicted, this.confidence);
    root.appendChild(readout);

    root.appendChild(this.buildControls(cb));
  }

  private buildControls(cb: THudCallbacks): HTMLElement {
    const bar = el('div', 'hud-controls');

    const digits = el('div', 'hud-digits');
    for (let d = 0; d < 10; d++) {
      const b = document.createElement('button');
      b.className = 'hud-btn hud-digit';
      b.textContent = String(d);
      b.addEventListener('click', () => cb.onDigit(d));
      digits.appendChild(b);
    }
    bar.appendChild(group('Pick a digit', [digits, button('✎ Draw', 'hud-draw', cb.onDraw)]));
    bar.appendChild(
      group('Run the network', [
        button('▶ Play', 'hud-play', cb.onPlay),
        button('⤓ Step', 'hud-step', cb.onStep),
      ]),
    );
    bar.appendChild(
      group('Brain', [
        button('🧠 Trained', 'hud-trained', cb.onTrained),
        button('⟳ Random', 'hud-rand', cb.onRandomize),
      ]),
    );
    bar.appendChild(group('View', [button('◑ Theme', 'hud-theme', cb.onTheme)]));
    return bar;
  }

  update(state: THudState): void {
    this.modeBadge.classList.toggle('is-random', state.mode === 'random');
    this.modeBadge.textContent =
      state.mode === 'trained'
        ? `● TRAINED MODEL · ${(state.accuracy * 100).toFixed(1)}% accurate`
        : '● RANDOM BRAIN · untrained (predictions are noise)';

    const fn = ACTIVATION_LABEL[state.activation];
    this.activationBtn.disabled = state.activationLocked;
    this.activationBtn.classList.toggle('locked', state.activationLocked);
    this.activationBtn.title = state.activationLocked
      ? 'The activation function each hidden neuron fires through. Locked to ReLU because the model was trained with it — switch to Random to experiment.'
      : 'The activation function each hidden neuron fires through. Click to cycle ReLU → Sigmoid → tanh → Linear.';
    this.activationBtn.textContent = state.activationLocked
      ? `Hidden activation: ${fn} 🔒 locked`
      : `Hidden activation: ${fn} — click to change`;
    this.activationHint.textContent = state.activationLocked
      ? 'fixed to ReLU for the trained model — press ⟳ Random to change it'
      : 'press 🧠 Trained to restore the trained model';
    this.edges.title =
      'Connection lines drawn vs. total weights. Only a subset is rendered for performance; all weights are still computed.';
    this.edges.textContent = `Connections shown: ${fmt(state.edgesRendered)} / ${fmt(state.edgesTotal)}`;
    this.predicted.textContent = String(state.predicted);
    this.confidence.textContent = `${(state.confidence * 100).toFixed(1)}% confident`;
  }
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function span(className: string, text: string): HTMLElement {
  const node = el('span', className);
  node.textContent = text;
  return node;
}

function label(text: string): HTMLElement {
  return span('hud-label', text);
}

/** A labeled cluster of controls. */
function group(title: string, children: readonly HTMLElement[]): HTMLElement {
  const g = el('div', 'hud-group');
  const lbl = el('span', 'hud-group-label');
  lbl.textContent = title;
  const row = el('div', 'hud-group-row');
  row.append(...children);
  g.append(lbl, row);
  return g;
}

function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `hud-btn ${className}`;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
