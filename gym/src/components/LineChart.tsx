import { fmtKg, shortDate } from '../lib/format';

/** Schlichtes Liniendiagramm: x = Datum (gleichmäßig), y = kg. */
export function LineChart(props: { points: { date: string; value: number }[]; color: string }) {
  const pts = props.points;
  if (pts.length === 0) return <div className="empty">Noch keine Werte.</div>;
  const W = 340, H = 170, padL = 34, padR = 12, padT = 14, padB = 24;
  const vals = pts.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
  const span = hi - lo;
  lo -= span * 0.1; hi += span * 0.1;
  const x = (i: number) => (pts.length === 1 ? (padL + W - padR) / 2 : padL + (i * (W - padL - padR)) / (pts.length - 1));
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const labelIdx = pts.length <= 4 ? pts.map((_, i) => i) : [0, Math.floor((pts.length - 1) / 2), pts.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Verlauf">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" />
          <text x={padL - 6} y={y(t) + 4} textAnchor="end">{fmtKg(Math.round(t))}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={props.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--card)" stroke={props.color} strokeWidth={2} />
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}>{shortDate(pts[i].date)}</text>
      ))}
    </svg>
  );
}
