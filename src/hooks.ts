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
