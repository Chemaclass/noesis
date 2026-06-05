type Props = {
  readonly values: readonly number[];
  readonly label: string;
};

/**
 * Tiny dependency-free SVG line chart. Auto-scales to its own min/max so the
 * shape of the trend is always visible. Used for the live training-loss curve.
 */
export function Sparkline({ values, label }: Props): JSX.Element {
  const W = 240;
  const H = 56;
  const n = values.length;
  let path = '';
  if (n >= 2) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    path = values
      .map((v, i) => {
        const x = (i / (n - 1)) * W;
        const y = H - ((v - min) / span) * (H - 4) - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div className="spark">
      <div className="spark-label">
        <span>{label}</span>
        <span className="spark-now">{n ? (values[n - 1] ?? 0).toFixed(3) : '—'}</span>
      </div>
      <svg className="spark-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        {path && <path d={path} fill="none" />}
      </svg>
    </div>
  );
}
