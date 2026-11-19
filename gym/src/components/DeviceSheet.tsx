import { useEffect, useState } from 'react';
import type { Device } from '../lib/types';
import { fmtKg, parseKg, todayISO } from '../lib/format';
import { deleteDevice, updateDevice } from '../lib/actions';
import { Sheet } from './ui';

/** Gerät bearbeiten: Name, Ziel, Zusatzgewicht-Stufen. */
export function DeviceSheet(props: { device: Device | null; onClose: () => void; kb: boolean }) {
  const d = props.device;
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetNote, setTargetNote] = useState('');
  const [steps, setSteps] = useState('');

  useEffect(() => {
    if (!d) return;
    setName(d.name);
    setTarget(d.target != null ? fmtKg(d.target) : '');
    setTargetNote(d.targetNote ?? '');
    setSteps(d.steps.map(fmtKg).join('; '));
  }, [d]);

  const save = async () => {
    if (!d) return;
    const parsed = steps
      .split(/[;\s]+/)
      .map((s) => parseKg(s.replace(/^\+/, '')))
      .filter((n): n is number => n != null);
    await updateDevice(d.id, {
      name: name.trim() || d.name,
      target: parseKg(target),
      targetSetAt: parseKg(target) !== (d.target ?? null) ? todayISO() : d.targetSetAt,
      targetNote: targetNote.trim(),
      steps: [...new Set(parsed)].sort((a, b) => a - b),
    });
    props.onClose();
  };

  const remove = async () => {
    if (!d) return;
    if (!confirm(`„${d.name}" mit allen Einträgen und Max-Werten löschen?`)) return;
    await deleteDevice(d.id);
    props.onClose();
  };

  return (
    <Sheet open={!!d} onClose={props.onClose} kb={props.kb}>
      <h2>Gerät bearbeiten</h2>
      <div className="subtitle">Tag {d?.plan}</div>
      <div className="field">
        <label>Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="btn-row field">
        <div>
          <label className="muted" style={{ fontSize: 13, display: 'block', margin: '0 0 5px 2px' }}>Ziel nächstes Training (kg)</label>
          <input className="input num" inputMode="decimal" value={target} placeholder="–" onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div>
          <label className="muted" style={{ fontSize: 13, display: 'block', margin: '0 0 5px 2px' }}>Ziel-Notiz</label>
          <input className="input" value={targetNote} placeholder="z. B. bis 70" onChange={(e) => setTargetNote(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Zusatzgewicht-Stufen (kg, mit ; getrennt)</label>
        <input className="input num" inputMode="decimal" value={steps} onChange={(e) => setSteps(e.target.value)} />
        <div className="hint">Standard: 0; 1,1; 2,3; 3,4; 4,5 – leer lassen, wenn das Gerät keinen Hebel hat.</div>
      </div>
      <div className="btn-row">
        <button className="btn danger" onClick={remove}>Löschen</button>
        <button className="btn" onClick={save}>Sichern</button>
      </div>
    </Sheet>
  );
}
