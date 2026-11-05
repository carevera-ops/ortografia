import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useStreak } from '../hooks';
import { ACHIEVEMENTS, newAchievements, type AchievementDef } from '../core/achievements/achievements';

/**
 * Comprueba las insignias cuando cambia el progreso, guarda las nuevas y las anuncia
 * con un aviso que no interrumpe (y nunca en mitad de una lección).
 */
export function AchievementWatcher({ paused }: { paused: boolean }) {
  const streak = useStreak();
  const data = useLiveQuery(async () => {
    const [days, skills, sessions, levels, have] = await Promise.all([
      db.dailyStats.toArray(),
      db.skillMastery.toArray(),
      db.sessions.toArray(),
      db.levelProgress.toArray(),
      db.achievements.toArray(),
    ]);
    return { days, skills, sessions, levels, have: new Set(have.map((h) => h.id)) };
  }, []);
  const [queue, setQueue] = useState<AchievementDef[]>([]);

  useEffect(() => {
    if (!data || !streak || paused) return;
    const fresh = newAchievements({ ...data, bestStreak: streak.best }, data.have);
    if (fresh.length === 0) return;
    const at = new Date().toISOString();
    void db.achievements.bulkPut(fresh.map((a) => ({ id: a.id, unlockedAt: at })));
    setQueue((q) => [...q, ...fresh.filter((f) => !q.some((x) => x.id === f.id))]);
  }, [data, streak?.best, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 4200);
    return () => clearTimeout(t);
  }, [current]);

  if (!current || paused) return null;
  return (
    <div className="badge-toast anim-pop" role="status" aria-live="polite" onClick={() => setQueue((q) => q.slice(1))}>
      <span className="badge-emoji" aria-hidden="true">
        {current.emoji}
      </span>
      <div>
        <div className="small-text">¡Nueva insignia!</div>
        <strong>{current.title}</strong>
      </div>
    </div>
  );
}

/** Rejilla de insignias (conseguidas en color, pendientes en gris). */
export function BadgeGrid() {
  const have = useLiveQuery(() => db.achievements.toArray(), []);
  const got = new Map((have ?? []).map((h) => [h.id, h.unlockedAt]));
  return (
    <ul className="badges">
      {ACHIEVEMENTS.map((a) => {
        const at = got.get(a.id);
        return (
          <li key={a.id} className={`badge${at ? ' got' : ''}`} aria-label={`${a.title}: ${a.description}${at ? ' Conseguida.' : ' Pendiente.'}`}>
            <span className="badge-emoji" aria-hidden="true">
              {a.emoji}
            </span>
            <strong>{a.title}</strong>
            <span className="small-text muted">{a.description}</span>
          </li>
        );
      })}
    </ul>
  );
}
