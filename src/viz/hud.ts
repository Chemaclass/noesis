import type { TActivationName } from '../core/types';

export type THudCallbacks = {
  readonly onDigit: (digit: number) => void;
  readonly onActivation: () => void;
  readonly onPlay: () => void;
  readonly onStep: () => void;
  readonly onRandomize: () => void;
  readonly onTrained: () => void;
  readonly onDraw: () => void;
};

export type THudState = {
  readonly layerLabels: readonly string[];
  readonly neuronCounts: readonly number[];
  readonly activation: TActivationName;
  readonly edgesRendered: number;
  readonly edgesTotal: number;
  readonly predicted: number;
  readonly confidence: number;
};

/** Telemetry + controls overlay. Pure DOM, sits on top of the WebGL canvas. */
export class Hud {
  private readonly activationBtn: HTMLButtonElement;
  private readonly edges: HTMLElement;
  private readonly predicted: HTMLElement;
  private readonly confidence: HTMLElement;

  constructor(root: HTMLElement, cb: THudCallbacks) {
    const right = el('div', 'hud-panel hud-right');
    this.activationBtn = document.createElement('button');
    this.activationBtn.className = 'hud-btn hud-activation';
    this.activationBtn.addEventListener('click', cb.onActivation);
    this.edges = el('div', 'hud-edges');
    right.append(this.activationBtn, this.edges);
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
    bar.appendChild(digits);

    bar.appendChild(button('✎ Draw', 'hud-draw', cb.onDraw));
    bar.appendChild(button('▶ Play', 'hud-play', cb.onPlay));
    bar.appendChild(button('⤓ Step', 'hud-step', cb.onStep));
    bar.appendChild(button('🧠 Trained', 'hud-trained', cb.onTrained));
    bar.appendChild(button('⟳ Random', 'hud-rand', cb.onRandomize));
    return bar;
  }

  update(state: THudState): void {
    this.activationBtn.textContent = `Activation: ${state.activation} [click]`;
    this.edges.textContent = `Edges: ${fmt(state.edgesRendered)} / ${fmt(state.edgesTotal)}`;
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
