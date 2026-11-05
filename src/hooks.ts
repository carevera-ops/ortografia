import { getSettings, DEFAULT_SETTINGS } from './db/db';
import { computeStreak, type StreakResult } from './core/streak/streak';
import { toLocalDate } from './core/time/dates';
import type { Settings } from './db/types';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { loadIndex } from './core/content/loader';
import { computePath, type PathState } from './core/engine/unlock';
import { UNITS } from './core/content/catalog';

/** Unidades con contenido disponible (índice precargado). */
export function useContentIndex(): Record<string, number> | null {
  const [index, setIndex] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    void loadIndex().then(setIndex).catch(() => setIndex({}));
  }, []);
  return index;
}

/** Estado del camino (se actualiza solo cuando cambia el progreso). */
export function usePath(): PathState | null {
  const index = useContentIndex();
  const rows = useLiveQuery(() => db.levelProgress.toArray(), []);
  if (!index || !rows) return null;
  return computePath(UNITS, rows, new Set(Object.keys(index)));
}


/** Fecha local de hoy; se actualiza sola (por si la app sigue abierta a medianoche). */
export function useToday(): string {
  const [today, setToday] = useState(toLocalDate());
  useEffect(() => {
    const t = setInterval(() => setToday(toLocalDate()), 30_000);
    const onVis = () => document.visibilityState === 'visible' && setToday(toLocalDate());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return today;
}

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('main'), []);
  useEffect(() => {
    void getSettings(); // crea los ajustes por defecto la primera vez
  }, []);
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

/** Racha recalculada a partir del historial (se actualiza al cambiar los datos). */
export function useStreak(): (StreakResult & { today: string }) | null {
  const today = useToday();
  const settings = useSettings();
  const days = useLiveQuery(() => db.dailyStats.toArray(), []);
  if (!days) return null;
  return { ...computeStreak(days, today, { criterion: settings.streakCriterion, minutes: settings.streakMinutes }), today };
}
