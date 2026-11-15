import { useState } from 'react';
import type { Plan } from '../lib/types';
import type { Data } from '../lib/logic';
import { devicesOf, historyOf } from '../lib/logic';
import { fmtKg, longDate } from '../lib/format';
import { LineChart } from '../components/LineChart';
import { MaxSheet, type MaxTarget } from '../components/MaxSheet';
import { Icon, TopBar } from '../components/ui';

export function More(props: { data: Data; kb: boolean; initialDevice?: string; initialTab?: 'verlauf' | 'max'; onBack: () => void }) {
  const { data } = props;
  const init = data.devices.find((d) => d.id === props.initialDevice);
  const [tab, setTab] = useState<'verlauf' | 'max'>(props.initialTab ?? 'verlauf');
  const [plan, setPlan] = useState<Plan>(init?.plan ?? 'A');
  const [devId, setDevId] = useState<string | undefined>(init?.id);
  const [maxFilter, setMaxFilter] = useState<string>(init?.id ?? 'all');
  const [maxTarget, setMaxTarget] = useState<MaxTarget>(null);

  const devs = devicesOf(data, plan);
  const dev = devs.find((d) => d.id === devId) ?? devs[0];
  const hist = dev ? historyOf(data, dev.id) : [];
  const color = plan === 'A' ? 'var(--sage)' : 'var(--lav)';
  const name = (id: string) => data.devices.find((d) => d.id === id)?.name ?? '?';

  const maxList = data.maxTests
    .filter((m) => maxFilter === 'all' || m.deviceId === maxFilter)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const maxDevices = [...new Set(data.maxTests.map((m) => m.deviceId))];
  const allDevs = [...devicesOf(data, 'A'), ...devicesOf(data, 'B')];

  return (
    <div className="screen">
      <TopBar onBack={props.onBack} title="More" />
      <div className="scroll">
        <div className="seg">
          <button className={tab === 'verlauf' ? 'on' : ''} onClick={() => setTab('verlauf')}>Verlauf</button>
          <button className={tab === 'max' ? 'on' : ''} onClick={() => setTab('max')}>Maximalkraft</button>
        </div>

        {tab === 'verlauf' && (
          <>
            <div className="chips" style={{ marginBottom: 10 }}>
              {(['A', 'B'] as const).map((p) => (
                <button key={p} className={`chip ${plan === p ? 'on' : ''} ${p === 'B' ? 'lav' : ''}`} onClick={() => { setPlan(p); setDevId(undefined); }}>Tag {p}</button>
              ))}
            </div>
            <div className="chips scrollx" style={{ marginBottom: 14 }}>
              {devs.map((d) => (
                <button key={d.id} className={`chip ${dev?.id === d.id ? 'on' : ''} ${plan === 'B' ? 'lav' : ''}`} onClick={() => setDevId(d.id)}>{d.name}</button>
              ))}
            </div>
            {dev && (
              <>
                <div className="card">
                  <h3>{dev.name} · Gewicht (kg)</h3>
                  <LineChart points={hist.map((h) => ({ date: h.date, value: h.weight }))} color={color} />
                </div>
                <div className="card">
                  {hist.length === 0 && <div className="empty">Noch keine Einträge.</div>}
                  {[...hist].reverse().map((h) => (
                    <div className="list-row" key={h.date}>
                      <span className="date num">{longDate(h.date)}</span>
                      <span className="val num">{fmtKg(h.weight)}</span>
                      <span className="note">{h.note || '2×12'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'max' && (
          <>
            <div className="chips scrollx" style={{ marginBottom: 14 }}>
              <button className={`chip ${maxFilter === 'all' ? 'on' : ''}`} onClick={() => setMaxFilter('all')}>Alle</button>
              {allDevs.filter((d) => maxDevices.includes(d.id) || d.id === maxFilter).map((d) => (
                <button key={d.id} className={`chip ${maxFilter === d.id ? 'on' : ''}`} onClick={() => setMaxFilter(d.id)}>{d.name}</button>
              ))}
            </div>
            {maxFilter !== 'all' && maxList.length >= 2 && (
              <div className="card">
                <h3>{name(maxFilter)} · Max (kg)</h3>
                <LineChart points={[...maxList].reverse().map((m) => ({ date: m.date, value: m.max }))} color="var(--sand)" />
              </div>
            )}
            <div className="card">
              {maxList.length === 0 && <div className="empty">Noch keine Max-Werte.</div>}
              {maxList.map((m) => (
                <button className="list-row" key={m.id} onClick={() => setMaxTarget({ test: m })}>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontWeight: 600 }}>{name(m.deviceId)}</span>
                    <span className="muted num" style={{ fontSize: 14 }}>{longDate(m.date)}</span>
                    {m.note && <span className="muted" style={{ display: 'block', fontSize: 14 }}>{m.note}</span>}
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="val num" style={{ display: 'block' }}>{fmtKg(m.max)} kg</span>
                    {m.suggested != null && <span className="muted num" style={{ fontSize: 14 }}>Vorschlag {fmtKg(m.suggested)}</span>}
                  </span>
                </button>
              ))}
            </div>
            <button className="btn secondary full" onClick={() => setMaxTarget({ deviceId: maxFilter !== 'all' ? maxFilter : undefined })}>
              <Icon name="plus" size={18} /> Max-Wert eintragen
            </button>
          </>
        )}
      </div>
      <MaxSheet
        target={maxTarget}
        devices={data.devices}
        onClose={() => setMaxTarget(null)}
        kb={props.kb}
      />
    </div>
  );
}
