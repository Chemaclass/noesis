import { useEffect, useState, type ReactNode } from 'react';
import type { TActivationName } from '../domain/types';
import type { TLayerStat } from '../app/inference';

type SectionProps = {
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
};

function Section({ title, defaultOpen = false, children }: SectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`panel-section${open ? '' : ' collapsed'}`}>
      <button className="section-head" onClick={() => setOpen((o) => !o)}>
        <span className="caret">▾</span>
        {title}
      </button>
      <div className="section-body">{children}</div>
    </div>
  );
}

type Props = {
  readonly layers: readonly TLayerStat[];
  readonly activation: TActivationName;
  readonly accuracy: number;
};

/** Left collapsible info panel: how it works, live stats, legend, math. */
export function InfoPanel({ layers, activation, accuracy }: Props): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const apply = (): void => setCollapsed(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <aside id="panel" className={`panel${collapsed ? ' panel--collapsed' : ''}`}>
      <div className="panel-title">
        <span className="panel-logo">
          noesis<small>neural brain</small>
        </span>
        <button
          className="panel-toggle"
          title="Collapse panel"
          aria-label="Toggle panel"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      <div className="panel-body">
        <Section title="How it works" defaultOpen>
          <p>A feedforward neural network classifying handwritten digits, rendered live in 3D.</p>
          <ol>
            <li>
              <b>Input</b> — your 28×28 digit, one neuron per pixel (the glowing plane).
            </li>
            <li>
              <b>Hidden layers</b> — detect strokes and shapes; each neuron sums its weighted inputs
              and fires through an activation function.
            </li>
            <li>
              <b>Output</b> — 10 neurons (0–9). The brightest is the prediction.
            </li>
          </ol>
          <p>
            Hit <b>Play</b> to watch the signal sweep layer by layer. <b>Draw</b> your own digit, or
            pick one. The <b>Untrained brain</b> shows random weights for contrast.
          </p>
          <span className="panel-accuracy">{`Trained model · ${(accuracy * 100).toFixed(1)}% test accuracy`}</span>
        </Section>

        <Section title="How learning works (+ LLMs)">
          <p>
            Pick <b>Watch it learn</b> in the Brain menu to train a small net live, from random.
          </p>
          <ol>
            <li>
              <b>Forward pass</b> — run an example through, get a guess.
            </li>
            <li>
              <b>Loss</b> — measure how wrong the guess is (cross-entropy).
            </li>
            <li>
              <b>Backprop</b> — compute which way every weight should move to be less wrong.
            </li>
            <li>
              <b>Step</b> — nudge all weights downhill (gradient descent). Repeat.
            </li>
          </ol>
          <p>
            That four-step loop is <i>all</i> of training — for digits here, and for a large
            language model. An <b>LLM</b> is the same primitives (weighted sums, activations, this
            loop) scaled up massively and predicting the next <i>token</i> instead of a digit, over
            much of the internet. Our demo learns from only 10 images, so it memorises rather than
            generalises — that gap is exactly why scale and data matter.
          </p>
        </Section>

        <Section title="Live layer details" defaultOpen>
          {layers.map((l) => (
            <div className="live-row" key={l.label}>
              <div className="live-head">
                <b>{l.label}</b>
                <span>{`${l.count} · ${l.activation}`}</span>
              </div>
              <div className="live-stats">
                {`min ${l.min.toFixed(2)} · mean ${l.mean.toFixed(2)} · max ${l.max.toFixed(2)}`}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Legend">
          <div className="legend-row">
            <span className="sw sw-pos" /> positive weight
          </div>
          <div className="legend-row">
            <span className="sw sw-neg" /> negative weight
          </div>
          <div className="legend-row">
            <span className="sw sw-cold" />→<span className="sw sw-hot" /> low → high activation
          </div>
          <div className="legend-row">line brightness ∝ |weight|</div>
          <div className="legend-row">neuron brightness ∝ activation</div>
        </Section>

        <Section title="Math">
          <p>Each layer computes, per neuron j:</p>
          <pre>{`z_j = Σ_i w_ji · x_i + b_j
a_j = f(z_j)`}</pre>
          <p>
            f = <span className="math-act">{activation}</span>
          </p>
          <p>Confidence = softmax over the 10 output logits.</p>
        </Section>
      </div>

      <footer className="panel-footer">
        <a
          className="footer-link"
          href="https://github.com/Chemaclass/noesis"
          target="_blank"
          rel="noreferrer noopener"
          title="Source code on GitHub"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          Source
        </a>
        <span className="footer-sep">·</span>
        <a
          className="footer-link"
          href="https://chemaclass.com/sponsor"
          target="_blank"
          rel="noreferrer noopener"
          title="Support this project"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor">
            <path d="M8 14.25.345 6.6a3.96 3.96 0 0 1 0-5.6 3.96 3.96 0 0 1 5.6 0L8 3.05l2.055-2.05a3.96 3.96 0 0 1 5.6 0 3.96 3.96 0 0 1 0 5.6L8 14.25Z" />
          </svg>
          Sponsor
        </a>
      </footer>
    </aside>
  );
}
