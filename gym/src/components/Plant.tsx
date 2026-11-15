/*
 * Weiche Pflanze in 5 Stufen (0 = Samen … 4 = fast ausgewachsen), 5 = fertiger Baum (Garten).
 * Reine SVG, sanfte Pastelltöne, keine Effekte.
 */
export function Plant({ stage, size = 190, className = 'plant' }: { stage: number; size?: number; className?: string }) {
  const leaf = 'var(--sage)';
  const leafDark = '#86A07E';
  const trunk = '#9E8C74';
  const soil = 'var(--sand)';
  const s = Math.max(0, Math.min(5, stage));
  // Höhe des Stamms je Stufe
  const h = [0, 26, 48, 70, 88, 96][s];
  const baseY = 168;
  const topY = baseY - h;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 200 200" aria-label={`Pflanze Stufe ${s}`}>
      <ellipse cx="100" cy="172" rx="62" ry="12" fill={soil} opacity="0.55" />
      <ellipse cx="100" cy="170" rx="40" ry="7" fill={soil} />
      <g style={{ transformOrigin: '100px 168px', transition: 'transform 0.8s cubic-bezier(0.22,1.2,0.36,1)' }}>
        {s === 0 && (
          <>
            <ellipse cx="100" cy="163" rx="9" ry="6" fill={trunk} opacity="0.8" />
            <path d="M100 158 q2 -8 8 -10" stroke={leaf} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        {s >= 1 && (
          <path d={`M100 ${baseY} C ${s >= 4 ? 96 : 99} ${baseY - h * 0.5}, ${s >= 4 ? 104 : 101} ${topY + h * 0.3}, 100 ${topY}`}
            stroke={s >= 3 ? trunk : leafDark} strokeWidth={[0, 3.5, 4.5, 6, 8, 9][s]} fill="none" strokeLinecap="round" />
        )}
        {s === 1 && (
          <>
            <Leaf x={100} y={topY + 4} r={-35} len={20} fill={leaf} />
            <Leaf x={100} y={topY + 4} r={35} len={20} fill={leaf} flip />
          </>
        )}
        {s === 2 && (
          <>
            <Leaf x={100} y={topY + 26} r={-50} len={22} fill={leaf} />
            <Leaf x={100} y={topY + 16} r={50} len={24} fill={leaf} flip />
            <Leaf x={100} y={topY + 2} r={-20} len={22} fill={leaf} />
            <Leaf x={100} y={topY + 2} r={20} len={22} fill={leaf} flip />
          </>
        )}
        {s === 3 && (
          <>
            <path d={`M100 ${topY + 30} q-14 -6 -22 -18`} stroke={trunk} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d={`M100 ${topY + 20} q14 -6 22 -18`} stroke={trunk} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <circle cx="77" cy={topY + 8} r="18" fill={leaf} opacity="0.85" />
            <circle cx="123" cy={topY - 2} r="18" fill={leaf} opacity="0.85" />
            <circle cx="100" cy={topY - 6} r="22" fill={leaf} />
          </>
        )}
        {s >= 4 && (
          <>
            <circle cx={100} cy={topY + 6} r={s === 5 ? 46 : 38} fill={leaf} opacity="0.55" />
            <circle cx={76} cy={topY + 14} r={s === 5 ? 28 : 24} fill={leaf} opacity="0.9" />
            <circle cx={124} cy={topY + 10} r={s === 5 ? 28 : 24} fill={leaf} opacity="0.9" />
            <circle cx={100} cy={topY - 10} r={s === 5 ? 32 : 27} fill={leaf} />
            {s === 5 && (
              <>
                <circle cx="84" cy={topY - 2} r="4" fill="var(--sand)" />
                <circle cx="118" cy={topY + 18} r="4" fill="var(--sand)" />
                <circle cx="106" cy={topY - 22} r="4" fill="var(--lav)" />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}

function Leaf(p: { x: number; y: number; r: number; len: number; fill: string; flip?: boolean }) {
  const w = p.len * 0.45;
  const d = `M0 0 C ${w} ${-p.len * 0.3}, ${w} ${-p.len * 0.8}, 0 ${-p.len} C ${-w} ${-p.len * 0.8}, ${-w} ${-p.len * 0.3}, 0 0 Z`;
  return <path d={d} fill={p.fill} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`} opacity={p.flip ? 0.9 : 1} />;
}
