import { useEffect, useState } from 'react';
import type { Device, MaxTest } from '../lib/types';
import { fmtKg, longDate, parseKg, todayISO } from '../lib/format';
import { deleteMaxTest, saveMaxTest } from '../lib/actions';
import { Sheet, toast } from './ui';

export type MaxTarget = { deviceId?: string; test?: MaxTest } | null;

/** Maximalkraft-Eintrag anlegen/bearbeiten. */
export function MaxSheet(props: { target: MaxTarget; devices: Device[]; onClose: () => void; kb: boolean }) {
  const t = props.target;
  const [deviceId, setDeviceId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [max, setMax] = useState('');
  const [sugg, setSugg] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!t) return;
    const m = t.test;
    setDeviceId(m?.deviceId ?? t.deviceId ?? props.devices[0]?.id ?? '');
    setDate(m?.date ?? todayISO());
    setMax(m ? fmtKg(m.max) : '');
    setSugg(m?.suggested != null ? fmtKg(m.suggested) : '');
    setNote(m?.note ?? '');
  }, [t]);

  const save = async () => {
    const m = parseKg(max);
    if (m == null) { toast('Bitte einen Max-Wert eintragen'); return; }
    if (!deviceId) return;
    await saveMaxTest({ id: t?.test?.id, deviceId, date: date || todayISO(), max: m, suggested: parseKg(sugg), note: note.trim() });
    toast('Maximalkraft gespeichert');
    props.onClose();
  };

  const remove = async () => {
    if (t?.test && confirm('Eintrag löschen?')) { await deleteMaxTest(t.test.id); props.onClose(); }
  };

  const fixed = !!t?.deviceId && !t.test;
  const dev = props.devices.find((d) => d.id === deviceId);

  return (
    <Sheet open={!!t} onClose={props.onClose} kb={props.kb}>
      <h2>Maximalkraft {fixed && dev ? `· ${dev.name}` : ''}</h2>
      <div className="subtitle">{date ? longDate(date) : ''}</div>
      {!fixed && (
        <div className="field">
          <label>Gerät</label>
          <select className="input" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {(['A', 'B'] as const).map((p) => (
              <optgroup key={p} label={`Tag ${p}`}>
                {props.devices.filter((d) => d.plan === p).sort((a, b) => a.order - b.order).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <div className="btn-row field">
        <div>
          <label className="muted" style={{ fontSize: 13, display: 'block', margin: '0 0 5px 2px' }}>Max (kg)</label>
          <input className="input num" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
        <div>
          <label className="muted" style={{ fontSize: 13, display: 'block', margin: '0 0 5px 2px' }}>Vorschlag (kg)</label>
          <input className="input num" inputMode="decimal" placeholder="optional" value={sugg} onChange={(e) => setSugg(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Datum</label>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Notiz</label>
        <input className="input" value={note} placeholder="optional" onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="btn-row">
        {t?.test && <button className="btn danger" onClick={remove}>Löschen</button>}
        <button className="btn" onClick={save}>Speichern</button>
      </div>
    </Sheet>
  );
}
