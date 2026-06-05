import type { TActivationName } from '../domain/types';
import type { TNoesis } from '../app/useNoesis';
import { PredictionBars } from './PredictionBars';

const ACTIVATION_LABEL: Record<TActivationName, string> = {
  relu: 'ReLU',
  sigmoid: 'Sigmoid',
  tanh: 'tanh',
  linear: 'Linear',
};
const ACTIVATIONS: TActivationName[] = ['relu', 'sigmoid', 'tanh', 'linear'];

type Props = {
  readonly noesis: TNoesis;
  readonly onOpenDraw: () => void;
};

/** Right-docked control panel: prediction, input, run, brain and activation. */
export function ControlPanel({ noesis, onOpenDraw }: Props): JSX.Element {
  const { session, derived, edges } = noesis;
  const fmt = (n: number): string => n.toLocaleString('en-US');

  return (
    <aside id="hud" className="controls">
      <div className="ctl-header">
        <span className="ctl-title">Controls</span>
        <button className="btn btn-icon" title="Toggle light / dark theme" onClick={noesis.toggleTheme}>
          ◑
        </button>
      </div>

      <div className="ctl-body">
        <section className="ctl-section">
          <span className="ctl-section-label">Prediction</span>
          <div className="ctl-pred-row">
            <div className="ctl-pred-text">
              <span className="ctl-pred-label">predicts</span>
              <div className="ctl-predicted">{derived.predicted}</div>
            </div>
            <div className="ctl-confidence">{`${(derived.confidence * 100).toFixed(1)}%`}</div>
          </div>
          <PredictionBars predicted={derived.predicted} outputs={derived.outputs} />
        </section>

        <section className="ctl-section">
          <span className="ctl-section-label">Input — pick or draw a digit</span>
          <div className="ctl-digits">
            {Array.from({ length: 10 }, (_, d) => (
              <button
                key={d}
                className={`btn ctl-digit${session.selectedDigit === d ? ' is-active' : ''}`}
                onClick={() => noesis.pickDigit(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <button className="btn btn-wide" onClick={onOpenDraw}>
            ✎ Draw your own
          </button>
        </section>

        <section className="ctl-section">
          <span className="ctl-section-label">Run the network</span>
          <div className="ctl-row">
            <button className="btn" onClick={noesis.play}>
              ▶ Play
            </button>
            <button className="btn" onClick={noesis.step}>
              ⤓ Step
            </button>
          </div>
        </section>

        <section className="ctl-section">
          <span className="ctl-section-label">Brain</span>
          <div className={`ctl-badge${session.mode === 'random' ? ' is-random' : ''}`}>
            {session.mode === 'trained'
              ? `● Trained · ${(derived.accuracy * 100).toFixed(1)}% accurate`
              : '● Untrained · predictions are noise'}
          </div>
          <select
            className="ctl-select"
            value={session.mode}
            onChange={(e) => noesis.setBrain(e.target.value === 'random' ? 'random' : 'trained')}
          >
            <option value="trained">Trained model</option>
            <option value="random">Untrained brain</option>
          </select>
          <button className="btn" onClick={noesis.reseed} disabled={session.mode !== 'random'}>
            ⟳ New random weights
          </button>
        </section>

        <section className="ctl-section">
          <span className="ctl-section-label">Hidden activation</span>
          <select
            className="ctl-select"
            value={session.hiddenActivation}
            disabled={derived.activationLocked}
            onChange={(e) => noesis.setActivation(e.target.value as TActivationName)}
          >
            {ACTIVATIONS.map((name) => (
              <option key={name} value={name}>
                {ACTIVATION_LABEL[name]}
              </option>
            ))}
          </select>
          <div className="ctl-hint">
            {derived.activationLocked
              ? 'Locked: the trained model needs ReLU. Switch the brain to “Untrained” to change it.'
              : 'How each neuron fires. Try them on the untrained brain.'}
          </div>
        </section>

        <div className="ctl-edges" title="Lines drawn vs. total weights; a subset is rendered for performance.">
          {`Connections shown: ${fmt(edges.rendered)} / ${fmt(edges.total)}`}
        </div>
      </div>
    </aside>
  );
}
