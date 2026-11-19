import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Device, Entry, Plan } from '../lib/types';
import { addKg, fmtKg, longDate, parseKg } from '../lib/format';
import { saveEntry, deleteEntry } from '../lib/actions';
import { Sheet } from './ui';
import { tick } from '../lib/haptics';
import type { Suggestion } from '../lib/suggest';

export interface CellCtx {
  plan: Plan;
  device: Device;
  date: string;
  isToday: boolean;
  sessionId: string | null;
  entry: Entry | null;
  last: number | null;
  /** Automatischer Vorschlag (nur leere Heute-Zelle). */
  suggestion: Suggestion | null;
}

export interface CellEditorHandle { open: (ctx: CellCtx) => void }

export const CellEditor = forwardRef<CellEditorHandle, { kb: boolean; onEditSteps: (d: Device) => void }>(function CellEditor(props, ref) {
  const [ctx, setCtx] = useState<CellCtx | null>(null);
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    open(c) {
      // flushSync + focus im selben Tipp, sonst öffnet iOS die Tastatur nicht.
      flushSync(() => {
        setCtx(c);
        setVal(c.entry?.weight != null ? fmtKg(c.entry.weight) : '');
        setNote(c.entry?.note ?? '');
        setOpen(true);
      });
      inputRef.current?.focus({ preventScroll: true });
    },
  }));

  const close = () => {
    inputRef.current?.blur();
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOpen(false);
  };

  const save = async () => {
    if (!ctx) return;
    let w = parseKg(val);
    if (w == null && val.trim() === '' && !ctx.entry) w = ctx.suggestion?.weight ?? ctx.last; // leer = Vorschlag
    if (w == null && !note.trim()) {
      if (ctx.sessionId && ctx.entry) await deleteEntry(ctx.sessionId, ctx.device.id);
    } else {
      await saveEntry({ plan: ctx.plan, date: ctx.date, sessionId: ctx.sessionId, deviceId: ctx.device.id, weight: w, note });
    }
    tick();
    close();
  };

  const remove = async () => {
    if (ctx?.sessionId) await deleteEntry(ctx.sessionId, ctx.device.id);
    close();
  };

  const current = parseKg(val) ?? (val.trim() === '' && !ctx?.entry ? ctx?.suggestion?.weight ?? null : null);
  const steps = ctx?.device.steps ?? [];

  return (
    <Sheet open={open} onClose={close} kb={props.kb}>
      <h2>{ctx?.device.name}</h2>
      <div className="subtitle">
        {ctx ? (ctx.isToday ? `Heute · ${longDate(ctx.date)}` : longDate(ctx.date)) : ''}
        {ctx?.last != null && ` · letztes Mal ${fmtKg(ctx.last)} kg`}
      </div>
      {ctx?.suggestion && (
        <div className="suggest-line">
          Vorschlag <b className="num">{fmtKg(ctx.suggestion.weight)} kg</b> · {ctx.suggestion.reason}
        </div>
      )}
      <div className="field bignum-row">
        <input
          ref={inputRef}
          className="input bignum"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          placeholder={ctx?.suggestion ? fmtKg(ctx.suggestion.weight) : ctx?.last != null ? fmtKg(ctx.last) : '0'}
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/[^0-9.,]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
        <span className="unit">kg</span>
      </div>
      {ctx?.last != null && steps.length > 0 && (
        <div className="field">
          <div className="chips scrollx">
            {steps.map((s) => {
              const v = addKg(ctx.last!, s);
              const on = current != null && current === v;
              return (
                <button
                  key={s}
                  className={`chip num ${on ? 'on' : ''} ${ctx.plan === 'B' ? 'lav' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setVal(fmtKg(v)); }}
                >
                  +{fmtKg(s)}
                </button>
              );
            })}
          </div>
          <div className="hint">
            Stufe wird zu {fmtKg(ctx.last)} kg addiert ·{' '}
            <button className="linkbtn" onClick={() => { const d = ctx.device; close(); props.onEditSteps(d); }}>Stufen ändern</button>
          </div>
        </div>
      )}
      <div className="field">
        <input
          className="input"
          type="text"
          placeholder="Notiz (leer = 2×12 geschafft)"
          value={note}
          enterKeyHint="done"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
      </div>
      <div className="btn-row">
        {ctx?.entry && <button className="btn danger" onClick={remove}>Löschen</button>}
        <button className="btn" onMouseDown={(e) => e.preventDefault()} onClick={save}>Speichern</button>
      </div>
    </Sheet>
  );
});
