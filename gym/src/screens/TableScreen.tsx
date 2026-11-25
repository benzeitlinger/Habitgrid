import { useMemo, useRef, useState } from 'react';
import type { Device, Plan } from '../lib/types';
import type { Column, Data } from '../lib/logic';
import { columnsFor, devicesOf, entryMap, lastWeightBefore, latestMax, markdownForClaude } from '../lib/logic';
import { fmtDiff, fmtKg, longDate, shortDate, todayISO } from '../lib/format';
import { addDevice, changeSessionDate, deleteSession, moveDevice, saveEntry } from '../lib/actions';
import { CellEditor, type CellEditorHandle } from '../components/CellEditor';
import { DeviceSheet } from '../components/DeviceSheet';
import { MaxSheet, type MaxTarget } from '../components/MaxSheet';
import { Icon, MenuSheet, Sheet, TopBar, toast, useLongPress } from '../components/ui';
import { tick } from '../lib/haptics';
import { suggest, targetActive } from '../lib/suggest';

interface Props {
  data: Data;
  plan: Plan;
  kb: boolean;
  onBack: () => void;
  onHistory: (deviceId: string, tab?: 'verlauf' | 'max') => void;
}

export function TableScreen({ data, plan, kb, onBack, onHistory }: Props) {
  const today = todayISO();
  const devices = devicesOf(data, plan);
  const cols = useMemo(() => columnsFor(data, plan, today), [data, plan, today]);
  const em = useMemo(() => entryMap(data.entries), [data.entries]);
  const editor = useRef<CellEditorHandle>(null);

  const [devMenu, setDevMenu] = useState<Device | null>(null);
  const [editDev, setEditDev] = useState<Device | null>(null);
  const [maxTarget, setMaxTarget] = useState<MaxTarget>(null);
  const [maxInfo, setMaxInfo] = useState<Device | null>(null);
  const [colMenu, setColMenu] = useState<Column | null>(null);
  const [manage, setManage] = useState(false);
  const [dateEdit, setDateEdit] = useState<Column | null>(null);
  const [newDate, setNewDate] = useState('');

  const tint = plan === 'A' ? 'var(--sage)' : 'var(--lav)';

  const copy = async () => {
    const md = markdownForClaude(data, plan);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    tick();
    toast('Letzte 3 Trainings kopiert');
  };

  const openCell = (d: Device, c: Column) => {
    const entry = c.session ? em.get(`${c.session.id}|${d.id}`) ?? null : null;
    const last = lastWeightBefore(data, d.id, c.date)?.weight ?? null;
    const suggestion = c.isToday && !entry ? suggest(data, d, c.date) : null;
    editor.current?.open({ plan, device: d, date: c.date, isToday: c.isToday, sessionId: c.session?.id ?? null, entry, last, suggestion });
  };

  const adopt = async (d: Device, c: Column, w: number) => {
    await saveEntry({ plan, date: c.date, sessionId: c.session?.id ?? null, deviceId: d.id, weight: w, note: '' });
    tick();
  };

  const liveDev = (d: Device | null) => (d ? data.devices.find((x) => x.id === d.id) ?? null : null);

  return (
    <div className="screen">
      <TopBar
        onBack={onBack}
        title={<span>Tag {plan} <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 5, background: tint, verticalAlign: 'middle', marginLeft: 4 }} /></span>}
      />
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="devcol"><span className="colhead"><small>Gerät</small></span></th>
              {cols.map((c) => (
                <th key={c.session?.id ?? 'today'} className={c.isToday ? 'today-col' : ''}>
                  <button className="colhead num" onClick={() => c.session && setColMenu(c)}>
                    <small>{c.isToday ? 'Heute' : ' '}</small>
                    {shortDate(c.date)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <DeviceHeader
                  device={d}
                  hasMax={!!latestMax(data, d.id)}
                  targetOpen={targetActive(data, d, today)}
                  onMenu={() => setDevMenu(d)}
                  onMax={() => setMaxInfo(d)}
                />
                {cols.map((c) => {
                  const e = c.session ? em.get(`${c.session.id}|${d.id}`) : undefined;
                  const prev = lastWeightBefore(data, d.id, c.date)?.weight ?? null;
                  const sg = c.isToday && !e ? suggest(data, d, c.date) : null;
                  return (
                    <td key={c.session?.id ?? 'today'} className={c.isToday ? 'today-col' : ''}>
                      <div className="cell noselect" role="button" onClick={() => openCell(d, c)}>
                        {e && e.weight != null ? (
                          <>
                            <span className="w num">{fmtKg(e.weight)}</span>
                            {prev != null && e.weight !== prev && (
                              <span className="d num">
                                {e.weight > prev && <i className="dot" />}
                                {e.weight > prev ? '↑' : '↓'} {fmtDiff(e.weight - prev).slice(1)}
                              </span>
                            )}
                            {e.note && <span className="n">{e.note}</span>}
                          </>
                        ) : e?.note ? (
                          <span className="n">{e.note}</span>
                        ) : sg ? (
                          <>
                            <button
                              className={`ph num ${sg.kind}`}
                              aria-label={`Vorschlag ${fmtKg(sg.weight)} kg übernehmen`}
                              onClick={(ev) => { ev.stopPropagation(); adopt(d, c, sg.weight); }}
                            >
                              {fmtKg(sg.weight)}
                            </button>
                            <span className="d num ph-why">
                              {sg.kind === 'hold' ? '= wie zuletzt' : sg.weight > sg.last ? `↑ ${fmtKg(Math.round((sg.weight - sg.last) * 100) / 100)}` : sg.kind === 'target' ? 'Ziel' : ''}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {devices.length === 0 && <div className="empty">Noch keine Geräte – unten „Geräte bearbeiten".</div>}
      </div>
      <div className="table-foot">
        <button className="pill" onClick={copy}><Icon name="copy" size={17} /> Für Claude kopieren</button>
        <button className="pill" onClick={() => setManage(true)}><Icon name="edit" size={17} /> Geräte</button>
      </div>

      <CellEditor ref={editor} kb={kb} onEditSteps={(d) => setEditDev(d)} />

      <MenuSheet
        open={!!devMenu}
        title={devMenu?.name}
        subtitle={`Tag ${plan}`}
        onClose={() => setDevMenu(null)}
        items={[
          { label: 'Maximalkraft eintragen', onClick: () => { setMaxTarget({ deviceId: devMenu!.id }); setDevMenu(null); } },
          { label: 'Verlauf ansehen', onClick: () => { const id = devMenu!.id; setDevMenu(null); onHistory(id); } },
          { label: 'Gerät bearbeiten (Name, Ziel, Stufen)', onClick: () => { setEditDev(devMenu); setDevMenu(null); } },
        ]}
      />

      <MenuSheet
        open={!!maxInfo}
        title={maxInfo ? `Maximalkraft · ${maxInfo.name}` : ''}
        onClose={() => setMaxInfo(null)}
        items={[
          { label: 'Neuen Max-Wert eintragen', onClick: () => { setMaxTarget({ deviceId: maxInfo!.id }); setMaxInfo(null); } },
          { label: 'Alle Max-Werte (More)', onClick: () => { const id = maxInfo!.id; setMaxInfo(null); onHistory(id, 'max'); } },
        ]}
      >
        {maxInfo && (() => {
          const m = latestMax(data, maxInfo.id);
          return m ? (
            <div className="card" style={{ background: 'var(--sand-soft)', boxShadow: 'none' }}>
              <div className="num" style={{ fontSize: 30, fontWeight: 700 }}>{fmtKg(m.max)} kg</div>
              <div className="muted">{longDate(m.date)}{m.suggested != null && ` · Vorschlag ${fmtKg(m.suggested)} kg`}</div>
              {m.note && <div className="muted" style={{ marginTop: 4 }}>{m.note}</div>}
            </div>
          ) : null;
        })()}
      </MenuSheet>

      <MenuSheet
        open={!!colMenu}
        title={colMenu ? longDate(colMenu.date) : ''}
        subtitle="Training"
        onClose={() => setColMenu(null)}
        items={[
          { label: 'Datum ändern', onClick: () => { setNewDate(colMenu!.date); setDateEdit(colMenu); setColMenu(null); } },
          {
            label: 'Spalte löschen', danger: true,
            onClick: async () => {
              const c = colMenu!;
              const n = data.entries.filter((e) => e.sessionId === c.session!.id).length;
              if (n === 0 || confirm(`Spalte ${shortDate(c.date)} mit ${n} Einträgen löschen?`)) {
                await deleteSession(c.session!.id);
                toast('Spalte gelöscht');
              }
              setColMenu(null);
            },
          },
        ]}
      />

      <Sheet open={!!dateEdit} onClose={() => setDateEdit(null)} kb={kb}>
        <h2>Datum ändern</h2>
        <div className="subtitle">{newDate ? longDate(newDate) : ''}</div>
        <div className="field"><input className="input" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
        <button
          className="btn full"
          onClick={async () => {
            if (!dateEdit?.session || !newDate) return;
            const clash = data.sessions.some((s) => s.plan === plan && s.date === newDate && s.id !== dateEdit.session!.id);
            if (clash) { toast('An dem Tag gibt es schon eine Spalte'); return; }
            await changeSessionDate(dateEdit.session.id, newDate);
            setDateEdit(null);
          }}
        >Sichern</button>
      </Sheet>

      <Sheet open={manage} onClose={() => setManage(false)}>
        <h2>Geräte · Tag {plan}</h2>
        <div className="subtitle">Tippen zum Bearbeiten, Pfeile für die Reihenfolge.</div>
        <div>
          {devices.map((d, i) => (
            <div className="devrow" key={d.id}>
              <button className="nm" onClick={() => setEditDev(d)}>{d.name}</button>
              <button className="iconbtn" disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }} onClick={() => moveDevice(plan, d.id, -1)} aria-label="Nach oben"><Icon name="up" /></button>
              <button className="iconbtn" disabled={i === devices.length - 1} style={{ opacity: i === devices.length - 1 ? 0.3 : 1 }} onClick={() => moveDevice(plan, d.id, 1)} aria-label="Nach unten"><Icon name="down" /></button>
            </div>
          ))}
        </div>
        <button
          className="btn secondary full"
          style={{ marginTop: 12 }}
          onClick={async () => {
            const name = prompt('Name des neuen Geräts');
            if (name?.trim()) await addDevice(plan, name.trim());
          }}
        ><Icon name="plus" size={18} /> Gerät hinzufügen</button>
      </Sheet>

      <DeviceSheet device={liveDev(editDev)} onClose={() => setEditDev(null)} kb={kb} />
      <MaxSheet target={maxTarget} devices={data.devices} onClose={() => setMaxTarget(null)} kb={kb} />
    </div>
  );
}

function DeviceHeader(props: { device: Device; hasMax: boolean; targetOpen: boolean; onMenu: () => void; onMax: () => void }) {
  const lp = useLongPress(() => { tick(); props.onMenu(); }, props.onMenu);
  const d = props.device;
  return (
    <th className="devcol">
      <div className="dev noselect" role="button" {...lp}>
        <span className="name">
          {d.name}
          {props.hasMax && (
            <span
              className="maxbadge"
              role="button"
              aria-label="Maximalkraft anzeigen"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); props.onMax(); }}
            >
              <Icon name="gauge" size={15} stroke={2.2} />
            </span>
          )}
        </span>
        {d.target != null && props.targetOpen && (
          <div className="target num">Ziel: {fmtKg(d.target)}{d.targetNote ? ` · ${d.targetNote}` : ''}</div>
        )}
      </div>
    </th>
  );
}
