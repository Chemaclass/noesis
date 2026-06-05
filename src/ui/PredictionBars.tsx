type Props = {
  readonly predicted: number;
  readonly outputs: readonly number[];
};

/** Per-class probability bars (0–9), winner highlighted. */
export function PredictionBars({ predicted, outputs }: Props): JSX.Element {
  return (
    <div className="ctl-bars">
      {Array.from({ length: 10 }, (_, d) => {
        const p = outputs[d] ?? 0;
        return (
          <div key={d} className={`ctl-bar${d === predicted ? ' is-top' : ''}`}>
            <span className="ctl-bar-label">{d}</span>
            <div className="ctl-bar-track">
              <div className="ctl-bar-fill" style={{ width: `${(p * 100).toFixed(1)}%` }} />
            </div>
            <span className="ctl-bar-pct">{`${(p * 100).toFixed(0)}%`}</span>
          </div>
        );
      })}
    </div>
  );
}
