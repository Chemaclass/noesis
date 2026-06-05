import type { TActivationName } from '../core/types';

/** Human-friendly names for the activation functions. */
const ACTIVATION_LABEL: Record<TActivationName, string> = {
  relu: 'ReLU',
  sigmoid: 'Sigmoid',
  tanh: 'tanh',
  linear: 'Linear',
};

const ACTIVATION_ORDER: TActivationName[] = ['relu', 'sigmoid', 'tanh', 'linear'];

export type THudCallbacks = {
  readonly onDigit: (digit: number) => void;
  readonly onDraw: () => void;
  readonly onPlay: () => void;
  readonly onStep: () => void;
  readonly onSelectBrain: (brain: 'trained' | 'random') => void;
  readonly onReseed: () => void;
  readonly onActivation: (name: TActivationName) => void;
  readonly onTheme: () => void;
};

export type THudState = {
  readonly activation: TActivationName;
  readonly activationLocked: boolean;
  readonly mode: 'trained' | 'random';
  readonly accuracy: number;
  readonly edgesRendered: number;
  readonly edgesTotal: number;
  readonly predicted: number;
  readonly confidence: number;
  /** Softmax probability per class (length 10). */
  readonly outputs: readonly number[];
  /** Currently selected preset digit, or null if drawn/custom. */
  readonly selectedDigit: number | null;
};

/** Right-docked control panel: prediction, input, run, brain and activation. */
export class Hud {
  private readonly predicted: HTMLElement;
  private readonly confidence: HTMLElement;
  private readonly modeBadge: HTMLElement;
  private readonly brainSelect: HTMLSelectElement;
  private readonly reseedBtn: HTMLButtonElement;
  private readonly actSelect: HTMLSelectElement;
  private readonly actHint: HTMLElement;
  private readonly edges: HTMLElement;
  private readonly digitButtons: HTMLButtonElement[] = [];
  private readonly bars: { row: HTMLElement; fill: HTMLElement; pct: HTMLElement }[] = [];

  constructor(root: HTMLElement, cb: THudCallbacks) {
    root.classList.add('controls');
    root.innerHTML = '';

    // Header: title + theme toggle
    const header = el('div', 'ctl-header');
    header.appendChild(spanEl('ctl-title', 'Controls'));
    const themeBtn = iconButton('◑', 'Toggle light / dark theme', cb.onTheme);
    header.appendChild(themeBtn);
    root.appendChild(header);

    const body = el('div', 'ctl-body');
    root.appendChild(body);

    // Prediction
    const pred = section('Prediction');
    const predRow = el('div', 'ctl-pred-row');
    this.predicted = el('div', 'ctl-predicted');
    this.confidence = el('div', 'ctl-confidence');
    const predText = el('div', 'ctl-pred-text');
    predText.append(spanEl('ctl-pred-label', 'predicts'), this.predicted);
    predRow.append(predText, this.confidence);
    pred.appendChild(predRow);

    // Per-class probability bars
    const bars = el('div', 'ctl-bars');
    for (let d = 0; d < 10; d++) {
      const row = el('div', 'ctl-bar');
      const track = el('div', 'ctl-bar-track');
      const fill = el('div', 'ctl-bar-fill');
      track.appendChild(fill);
      const pct = el('span', 'ctl-bar-pct');
      row.append(spanEl('ctl-bar-label', String(d)), track, pct);
      bars.appendChild(row);
      this.bars.push({ row, fill, pct });
    }
    pred.appendChild(bars);
    body.appendChild(wrap(pred));

    // Input
    const input = section('Input — pick or draw a digit');
    const digits = el('div', 'ctl-digits');
    for (let d = 0; d < 10; d++) {
      const b = document.createElement('button');
      b.className = 'btn ctl-digit';
      b.textContent = String(d);
      b.addEventListener('click', () => cb.onDigit(d));
      digits.appendChild(b);
      this.digitButtons.push(b);
    }
    input.append(digits, button('✎ Draw your own', cb.onDraw, 'btn-wide'));
    body.appendChild(wrap(input));

    // Run
    const run = section('Run the network');
    const runRow = el('div', 'ctl-row');
    runRow.append(button('▶ Play', cb.onPlay), button('⤓ Step', cb.onStep));
    run.appendChild(runRow);
    body.appendChild(wrap(run));

    // Brain
    const brain = section('Brain');
    this.modeBadge = el('div', 'ctl-badge');
    this.brainSelect = document.createElement('select');
    this.brainSelect.className = 'ctl-select';
    this.brainSelect.append(
      option('trained', 'Trained model'),
      option('random', 'Untrained brain'),
    );
    this.brainSelect.addEventListener('change', () =>
      cb.onSelectBrain(this.brainSelect.value === 'random' ? 'random' : 'trained'),
    );
    this.reseedBtn = button('⟳ New random weights', cb.onReseed);
    brain.append(this.modeBadge, this.brainSelect, this.reseedBtn);
    body.appendChild(wrap(brain));

    // Activation
    const act = section('Hidden activation');
    this.actSelect = document.createElement('select');
    this.actSelect.className = 'ctl-select';
    for (const name of ACTIVATION_ORDER) this.actSelect.append(option(name, ACTIVATION_LABEL[name]));
    this.actSelect.addEventListener('change', () =>
      cb.onActivation(this.actSelect.value as TActivationName),
    );
    this.actHint = el('div', 'ctl-hint');
    act.append(this.actSelect, this.actHint);
    body.appendChild(wrap(act));

    // Telemetry
    this.edges = el('div', 'ctl-edges');
    this.edges.title =
      'Connection lines drawn vs. total weights. Only a subset is rendered for performance; all weights are still computed.';
    body.appendChild(this.edges);
  }

  update(state: THudState): void {
    this.predicted.textContent = String(state.predicted);
    this.confidence.textContent = `${(state.confidence * 100).toFixed(1)}%`;

    // Per-class probability bars
    for (let d = 0; d < this.bars.length; d++) {
      const p = state.outputs[d] ?? 0;
      const bar = this.bars[d];
      if (!bar) continue;
      bar.fill.style.width = `${(p * 100).toFixed(1)}%`;
      bar.pct.textContent = `${(p * 100).toFixed(0)}%`;
      bar.row.classList.toggle('is-top', d === state.predicted);
    }

    // Highlight the selected preset digit
    for (let d = 0; d < this.digitButtons.length; d++) {
      this.digitButtons[d]?.classList.toggle('is-active', d === state.selectedDigit);
    }

    this.modeBadge.classList.toggle('is-random', state.mode === 'random');
    this.modeBadge.textContent =
      state.mode === 'trained'
        ? `● Trained · ${(state.accuracy * 100).toFixed(1)}% accurate`
        : '● Untrained · predictions are noise';
    this.brainSelect.value = state.mode;
    this.reseedBtn.disabled = state.mode !== 'random';

    this.actSelect.value = state.activation;
    this.actSelect.disabled = state.activationLocked;
    this.actHint.textContent = state.activationLocked
      ? 'Locked: the trained model needs ReLU. Switch the brain to “Untrained” to change it.'
      : 'How each neuron fires. Try them on the untrained brain.';

    this.edges.textContent = `Connections shown: ${fmt(state.edgesRendered)} / ${fmt(state.edgesTotal)}`;
  }
}

function section(title: string): HTMLElement {
  const s = el('div', 'ctl-section');
  s.appendChild(spanEl('ctl-section-label', title));
  return s;
}

/** Section already builds its own container; this is an identity passthrough. */
function wrap(node: HTMLElement): HTMLElement {
  return node;
}

function el(tag: string, className: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function spanEl(className: string, text: string): HTMLElement {
  const node = el('span', className);
  node.textContent = text;
  return node;
}

function option(value: string, text: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = text;
  return o;
}

function button(text: string, onClick: () => void, extra = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `btn ${extra}`.trim();
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function iconButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  const b = button(text, onClick, 'btn-icon');
  b.title = title;
  return b;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
