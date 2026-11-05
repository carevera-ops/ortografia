import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useStreak, useToday } from '../hooks';
import { isChampionDay, CHAMPION_MINUTES, CHAMPION_PCT } from '../core/streak/champion';
import { Mascot } from './Mascot';
import { playFinish } from '../audio/sfx';

function Confetti() {
  const colors = ['#ff7a3d', '#6c5ce7', '#2fb36d', '#ffb43d', '#e5484d', '#3dbbff'];
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 9) * 0.12}s`,
            animationDuration: `${2.2 + (i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Felicitación de «día de campeón»: 20 minutos de estudio con más del 90 % de aciertos.
 * Se muestra una sola vez al día y nunca en mitad de una lección.
 */
export function ChampionCelebration({ paused }: { paused: boolean }) {
  const today = useToday();
  const stat = useLiveQuery(() => db.dailyStats.get(today), [today]);
  const show = !paused && isChampionDay(stat) && !stat?.celebrated;
  useEffect(() => {
    if (show) playFinish();
  }, [show]);
  if (!show || !stat) return null;
  const pct = Math.round((100 * stat.correct) / stat.questions);
  const close = () => void db.dailyStats.update(today, { celebrated: true });
  return (
    <div className="sheet-backdrop celebrate" onClick={close}>
      <Confetti />
      <div className="sheet center" role="alertdialog" aria-modal="true" aria-labelledby="champ-title" onClick={(e) => e.stopPropagation()}>
        <div className="trophy anim-pop" aria-hidden="true">
          🏆
        </div>
        <Mascot size={80} bob />
        <h2 id="champ-title">¡Día de campeón!</h2>
        <p>
          Hoy has estudiado <strong>{Math.floor(stat.activeSec / 60)} minutos</strong> con un <strong>{pct} % de aciertos</strong>.
        </p>
        <p className="muted">
          Más de {CHAMPION_MINUTES} minutos y más de un {CHAMPION_PCT} %: eso es esfuerzo y concentración de verdad. ¡Estamos muy orgullosos de ti!
        </p>
        <button className="btn block" onClick={close} autoFocus>
          ¡Genial!
        </button>
      </div>
    </div>
  );
}

/** Animación de la llama cuando la racha crece (una vez por cada aumento). */
export function StreakUp({ paused, onVisible }: { paused: boolean; onVisible?: (v: boolean) => void }) {
  const streak = useStreak();
  // null = no hay nada guardado todavía; undefined = cargando.
  const stored = useLiveQuery(async () => (await db.streakState.get('main')) ?? null, []);
  const [visible, setVisible] = useState<number | null>(null);

  useEffect(() => {
    if (!streak || stored === undefined) return;
    const prev = stored?.current ?? 0;
    // Guardamos siempre el último cálculo (caché para la zona de padres y la copia).
    const changed = !stored || stored.current !== streak.current || stored.best !== streak.best || stored.freezes !== streak.freezes;
    if (!paused && streak.todayDone && streak.current > prev) setVisible(streak.current);
    if (changed && !paused) {
      void db.streakState.put({
        id: 'main',
        current: streak.current,
        best: streak.best,
        freezes: streak.freezes,
        lastDay: streak.todayDone ? streak.today : (stored?.lastDay ?? null),
        computedAt: new Date().toISOString(),
      });
    }
  }, [streak?.current, streak?.best, streak?.freezes, streak?.todayDone, stored?.current, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => onVisible?.(visible !== null), [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (visible === null) return null;
  return (
    <div className="sheet-backdrop" onClick={() => setVisible(null)}>
      <div className="sheet center" role="alertdialog" aria-modal="true" aria-labelledby="streak-title" onClick={(e) => e.stopPropagation()}>
        <div className="flame-big" aria-hidden="true">
          🔥
        </div>
        <h2 id="streak-title">
          ¡Racha de {visible} {visible === 1 ? 'día' : 'días'}!
        </h2>
        <p className="muted">
          {visible === 1 ? '¡Has empezado una racha! Vuelve mañana para que crezca.' : '¡Sigue así! Vuelve mañana para ampliarla.'}
          {visible % 7 === 0 && ' Además, has ganado un protector de racha 🧊.'}
        </p>
        <button className="btn block" onClick={() => setVisible(null)} autoFocus>
          ¡Vamos!
        </button>
      </div>
    </div>
  );
}
