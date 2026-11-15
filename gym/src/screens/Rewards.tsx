import type { Data } from '../lib/logic';
import { challengesFor, plantState, STAGES_PER_CYCLE, totalLeaves, type ChallengeState } from '../lib/rewards';
import { todayISO } from '../lib/format';
import { Plant } from '../components/Plant';
import { Icon } from '../components/ui';

export function Rewards({ data }: { data: Data }) {
  const today = todayISO();
  const plant = plantState(data);
  const daily = challengesFor(data, today, 'day');
  const weekly = challengesFor(data, today, 'week');
  const leaves = totalLeaves(data);

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Rewards <span className="wip">In Arbeit</span></h1>
        <span className="leaves num" aria-label={`${leaves} Blätter`}><Icon name="leaf" size={16} /> {leaves}</span>
      </div>
      <div className="scroll" style={{ paddingBottom: 'calc(var(--sab) + 60px)' }}>
        <div className="card plant-card">
          <Plant stage={plant.stage} />
          <div className="cap">
            {plant.stage === 0 ? 'Ein neuer Samen' : `Stufe ${plant.stage} von ${STAGES_PER_CYCLE}`} · {plant.trainings} Trainings
          </div>
          <div className="growbar"><i style={{ width: `${(plant.stage / STAGES_PER_CYCLE) * 100}%` }} /></div>
          <div className="section-title" style={{ margin: '16px 0 4px' }}>Garten</div>
          {plant.garden === 0 ? (
            <div className="garden-empty">Nach {STAGES_PER_CYCLE} Trainings zieht hier der erste Baum ein.</div>
          ) : (
            <div className="garden">
              {Array.from({ length: plant.garden }, (_, i) => <Plant key={i} stage={5} className="" size={38} />)}
            </div>
          )}
        </div>

        <div className="section-title">Heute</div>
        {daily.map((c) => <ChallengeCard key={c.def.id} c={c} />)}

        <div className="section-title">Diese Woche</div>
        {weekly.map((c) => <ChallengeCard key={c.def.id} c={c} />)}

        <p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '18px 12px' }}>
          Verpasste Tage nehmen dir nichts weg – die Pflanze wächst nur mit jedem Training.
        </p>
      </div>
    </div>
  );
}

function ChallengeCard({ c }: { c: ChallengeState }) {
  return (
    <div className={`card chal ${c.done ? 'done' : ''}`}>
      <span className="check">{c.done && <Icon name="check" size={16} stroke={2.6} />}</span>
      <div className="body">
        <div className="t">{c.title}</div>
        <div className="bar"><i style={{ width: `${(c.value / c.goal) * 100}%` }} /></div>
      </div>
      <span className="cnt">{c.value}/{c.goal}</span>
    </div>
  );
}
