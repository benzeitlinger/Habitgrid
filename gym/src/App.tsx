import { useEffect, useRef, useState } from 'react';
import type { Plan } from './lib/types';
import { useData } from './lib/useData';
import { Start } from './screens/Start';
import { TableScreen } from './screens/TableScreen';
import { More } from './screens/More';
import { Settings } from './screens/Settings';
import { Rewards } from './screens/Rewards';
import { useKeyboardInset } from './components/ui';

type View =
  | { name: 'start' }
  | { name: 'table'; plan: Plan }
  | { name: 'more'; deviceId?: string; tab?: 'verlauf' | 'max' }
  | { name: 'settings' };

export function App() {
  const data = useData();
  const kb = useKeyboardInset();
  const pager = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<View>({ name: 'start' });
  const [closing, setClosing] = useState(false);

  // App öffnet immer im Bereich Training.
  useEffect(() => { pager.current?.scrollTo({ left: 0 }); }, []);

  const go = (v: View) => { setClosing(false); setView(v); };
  const back = () => {
    setClosing(true);
    window.setTimeout(() => { setView({ name: 'start' }); setClosing(false); }, 200);
  };

  const onScroll = () => {
    const el = pager.current;
    if (el) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };
  const toPage = (i: number) => pager.current?.scrollTo({ left: i * (pager.current?.clientWidth ?? 0), behavior: 'smooth' });

  if (!data) return null;
  const sub = view.name !== 'start';

  return (
    <>
      <div className={`pager ${sub ? 'locked' : ''}`} ref={pager} onScroll={onScroll}>
        <section className="page" aria-label="Training">
          <Start
            data={data}
            onPlan={(p) => go({ name: 'table', plan: p })}
            onMore={() => go({ name: 'more' })}
            onSettings={() => go({ name: 'settings' })}
          />
          {sub && (
            <div className={`overlay-screen screen ${closing ? 'closing' : ''}`} style={{ paddingTop: 0 }}>
              {view.name === 'table' && (
                <TableScreen
                  data={data} plan={view.plan} kb={kb} onBack={back}
                  onHistory={(id, tab) => go({ name: 'more', deviceId: id, tab })}
                />
              )}
              {view.name === 'more' && <More data={data} kb={kb} initialDevice={view.deviceId} initialTab={view.tab} onBack={back} />}
              {view.name === 'settings' && <Settings onBack={back} />}
            </div>
          )}
        </section>
        <section className="page" aria-label="Rewards">
          <Rewards data={data} />
        </section>
      </div>
      <nav className={`dots ${sub ? 'hidden' : ''}`} aria-label="Seiten">
        {['Training', 'Rewards'].map((l, i) => (
          <button key={l} className={page === i ? 'on' : ''} aria-label={l} onClick={() => toPage(i)} />
        ))}
      </nav>
      <div id="toast" className="toast" role="status" />
    </>
  );
}
