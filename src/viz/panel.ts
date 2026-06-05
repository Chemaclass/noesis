import type { TActivationName } from '../core/types';

/** Per-layer live stats shown in the panel. */
export type TPanelLayer = {
  readonly label: string;
  readonly count: number;
  readonly activation: string;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
};

export type TPanelState = {
  readonly layers: readonly TPanelLayer[];
  readonly activation: TActivationName;
  readonly accuracy: number;
  readonly prediction: number;
  readonly confidence: number;
};

/**
 * Collapsible left-hand information panel: how it works, live layer details, a
 * color legend, and the math. Sections collapse independently; the whole panel
 * collapses to a thin rail.
 */
export class Panel {
  private readonly live: HTMLElement;
  private readonly mathActivation: HTMLElement;
  private readonly accuracyEl: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = '';
    root.classList.add('panel');

    const header = document.createElement('div');
    header.className = 'panel-title';
    header.innerHTML = `<span class="panel-logo">noesis<small>neural brain</small></span><button class="panel-toggle" title="Collapse panel" aria-label="Toggle panel">‹</button>`;
    const toggle = header.querySelector<HTMLButtonElement>('.panel-toggle');
    toggle?.addEventListener('click', () => {
      const collapsed = root.classList.toggle('panel--collapsed');
      toggle.textContent = collapsed ? '›' : '‹';
    });
    root.appendChild(header);

    const body = document.createElement('div');
    body.className = 'panel-body';
    root.appendChild(body);

    // --- How it works ---
    this.accuracyEl = span('panel-accuracy', '');
    const help = section('How it works', true);
    help.body.innerHTML = `
      <p>A feedforward neural network classifying handwritten digits, rendered live in 3D.</p>
      <ol>
        <li><b>Input</b> — your 28×28 digit, one neuron per pixel (the glowing plane).</li>
        <li><b>Hidden layers</b> — detect strokes and shapes; each neuron sums its
            weighted inputs and fires through an activation function.</li>
        <li><b>Output</b> — 10 neurons (0–9). The brightest is the prediction.</li>
      </ol>
      <p>Hit <b>Play</b> to watch the signal sweep layer by layer. <b>Draw</b> your own
         digit, or pick one. <b>Randomize</b> shows an <i>untrained</i> brain for contrast.</p>`;
    help.body.appendChild(this.accuracyEl);
    body.appendChild(help.el);

    // --- Live layer details ---
    const liveSec = section('Live layer details', true);
    this.live = liveSec.body;
    body.appendChild(liveSec.el);

    // --- Legend ---
    const legend = section('Legend', false);
    legend.body.innerHTML = `
      <div class="legend-row"><span class="sw sw-pos"></span> positive weight</div>
      <div class="legend-row"><span class="sw sw-neg"></span> negative weight</div>
      <div class="legend-row"><span class="sw sw-cold"></span>→<span class="sw sw-hot"></span> low → high activation</div>
      <div class="legend-row">line brightness ∝ |weight|</div>
      <div class="legend-row">neuron brightness ∝ activation</div>`;
    body.appendChild(legend.el);

    // --- Math ---
    const math = section('Math', false);
    this.mathActivation = span('math-act', 'relu');
    math.body.innerHTML = `
      <p>Each layer computes, per neuron <i>j</i>:</p>
      <pre>z_j = Σ_i w_ji · x_i + b_j
a_j = f(z_j)</pre>
      <p>f = </p>`;
    math.body.querySelector('p:last-child')?.appendChild(this.mathActivation);
    math.body.insertAdjacentHTML(
      'beforeend',
      `<p>Confidence = softmax over the 10 output logits.</p>`,
    );
    body.appendChild(math.el);
  }

  update(state: TPanelState): void {
    this.accuracyEl.textContent = `Trained model · ${(state.accuracy * 100).toFixed(1)}% test accuracy`;
    this.mathActivation.textContent = state.activation;

    this.live.innerHTML = '';
    for (const layer of state.layers) {
      const row = document.createElement('div');
      row.className = 'live-row';
      row.innerHTML = `
        <div class="live-head"><b>${layer.label}</b><span>${layer.count} · ${layer.activation}</span></div>
        <div class="live-stats">min ${fmt(layer.min)} · mean ${fmt(layer.mean)} · max ${fmt(layer.max)}</div>`;
      this.live.appendChild(row);
    }
  }
}

function section(title: string, open: boolean): { el: HTMLElement; body: HTMLElement } {
  const el = document.createElement('div');
  el.className = `panel-section${open ? '' : ' collapsed'}`;
  const head = document.createElement('button');
  head.className = 'section-head';
  head.innerHTML = `<span class="caret">▾</span>${title}`;
  const body = document.createElement('div');
  body.className = 'section-body';
  head.addEventListener('click', () => el.classList.toggle('collapsed'));
  el.append(head, body);
  return { el, body };
}

function span(className: string, text: string): HTMLElement {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

function fmt(x: number): string {
  return x.toFixed(2);
}
