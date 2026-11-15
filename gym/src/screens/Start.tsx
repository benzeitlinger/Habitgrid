import type { Plan } from '../lib/types';
import type { Data } from '../lib/logic';
import { devicesOf, trainedSessions } from '../lib/logic';
import { longDate, shortDate, todayISO } from '../lib/format';
import { Icon } from '../components/ui';

export function Start(props: { data: Data; onPlan: (p: Plan) => void; onMore: () => void; onSettings: () => void }) {
  const trained = trainedSessions(props.data);
  const sub = (p: Plan) => {
    const n = devicesOf(props.data, p).length;
    const last = trained.filter((s) => s.plan === p).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return `${n} Geräte${last ? ` · zuletzt ${shortDate(last.date)}` : ''}`;
  };
  return (
    <div className="screen start">
      <div className="start-head">
        <span className="date">{longDate(todayISO())}</span>
        <button className="iconbtn" onClick={props.onSettings} aria-label="Einstellungen"><Icon name="gear" size={22} /></button>
      </div>
      {(['A', 'B'] as const).map((p) => (
        <button key={p} className="plan-btn" onClick={() => props.onPlan(p)}>
          <span className="blob" style={{ background: p === 'A' ? 'var(--sage)' : 'var(--lav)' }} />
          <span className="letter">{p}</span>
          <span className="sub">{sub(p)}</span>
        </button>
      ))}
      <button className="more-link" onClick={props.onMore}>More</button>
    </div>
  );
}
