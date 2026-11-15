import { useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup, parseBackup } from '../lib/db';
import { todayISO } from '../lib/format';
import { TopBar, toast } from '../components/ui';
import { getTheme, setTheme, type Theme } from '../lib/theme';

export function Settings(props: { onBack: () => void }) {
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [theme, setT] = useState<Theme>(getTheme());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const doExport = async () => {
    const b = await exportBackup();
    const json = JSON.stringify(b, null, 2);
    const name = `gym-backup-${todayISO()}.json`;
    const file = new File([json], name, { type: 'application/json' });
    // iPhone: Teilen-Sheet → „In Dateien sichern"
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const doImport = async (f: File) => {
    try {
      const b = parseBackup(await f.text());
      if (!confirm(`Backup vom ${new Date(b.exportedAt).toLocaleDateString('de-DE')} importieren? Das ersetzt alle aktuellen Daten.`)) return;
      await importBackup(b);
      toast(`Importiert: ${b.sessions.length} Trainings, ${b.devices.length} Geräte`);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const persist = async () => {
    const ok = await navigator.storage?.persist?.();
    setPersisted(!!ok);
    toast(ok ? 'Speicher ist dauerhaft' : 'Browser hat abgelehnt – Backup bleibt wichtig');
  };

  return (
    <div className="screen">
      <TopBar onBack={props.onBack} title="Einstellungen" />
      <div className="scroll">
        <div className="section-title">Backup</div>
        <div className="card">
          <p style={{ margin: '0 0 12px', fontSize: 15 }} className="muted">
            Die Daten liegen nur auf diesem iPhone. Wird die Homescreen-App gelöscht, sind sie weg –
            exportiere deshalb regelmäßig ein Backup (z. B. in „Dateien" oder iCloud Drive).
          </p>
          <div className="btn-row">
            <button className="btn" onClick={doExport}>Exportieren</button>
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>Importieren</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) doImport(f); }} />
        </div>

        <div className="section-title">Speicher</div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }}>
              {persisted ? 'Dauerhafter Speicher aktiv' : persisted === false ? 'Speicher nicht als dauerhaft markiert' : 'Status unbekannt'}
            </span>
            {!persisted && <button className="pill" onClick={persist}>Anfragen</button>}
          </div>
        </div>

        <div className="section-title">Darstellung</div>
        <div className="seg">
          {([['system', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']] as const).map(([k, l]) => (
            <button key={k} className={theme === k ? 'on' : ''} onClick={() => { setTheme(k); setT(k); }}>{l}</button>
          ))}
        </div>

        <div className="section-title">Hinweis</div>
        <div className="card muted" style={{ fontSize: 15 }}>
          Eine Zelle ohne Notiz bedeutet: 2×12 geschafft. Lange auf ein Gerät drücken für
          Maximalkraft, Verlauf und Einstellungen des Geräts.
        </div>
      </div>
    </div>
  );
}
