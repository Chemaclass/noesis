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
    </aside>
  );
}
