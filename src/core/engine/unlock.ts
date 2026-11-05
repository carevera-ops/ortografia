import type { UnitInfo } from '../content/catalog';
import type { LevelProgress } from '../../db/types';

/** Porcentaje mínimo en el nivel final para desbloquear la unidad siguiente. */
export const PASS_PCT = 80;

export type LevelState = 'locked' | 'available' | 'completed';

export interface PathState {
  unitUnlocked: Record<string, boolean>;
  levelState: Record<string, LevelState[]>;
  /** Unidad dominada (repaso final ≥ 80 % o saltada con la prueba de nivel). */
  unitMastered: Record<string, boolean>;
  /** Siguiente nivel recomendado (para "Continuar"). */
  next: { unitId: string; level: number } | null;
}

const key = (u: string, l: number) => `${u}#${l}`;

/** ¿Se ha dominado la unidad? (nivel final con ≥ 80 % o saltada con la prueba de nivel). */
export function unitMastered(unit: UnitInfo, progress: Map<string, LevelProgress>): boolean {
  const last = progress.get(key(unit.id, unit.levels));
  if (last && (last.skipped || (last.completed && last.bestPct >= PASS_PCT))) return true;
  // Si se saltó con prueba de nivel, todos sus niveles constan como "skipped".
  return [...Array(unit.levels).keys()].every((i) => progress.get(key(unit.id, i + 1))?.skipped);
}

/**
 * Calcula qué unidades y niveles están desbloqueados.
 * @param playable unidades que ya tienen contenido (las demás aparecen como "próximamente")
 * @param unlockAll opción de la zona de padres: todo abierto (el progreso real se sigue guardando)
 */
export function computePath(units: UnitInfo[], rows: LevelProgress[], playable: Set<string>, unlockAll = false): PathState {
  const progress = new Map(rows.map((r) => [key(r.unitId, r.level), r]));
  const unitUnlocked: Record<string, boolean> = {};
  const levelState: Record<string, LevelState[]> = {};
  const mastered: Record<string, boolean> = {};
  let next: PathState['next'] = null;
  let prevMastered = true;

  for (const u of units) {
    const unlocked: boolean = (unlockAll || prevMastered) && playable.has(u.id);
    unitUnlocked[u.id] = unlocked;
    const states: LevelState[] = [];
    for (let l = 1; l <= u.levels; l++) {
      const p = progress.get(key(u.id, l));
      if (p && (p.completed || p.skipped)) states.push('completed');
      else if (unlocked && (unlockAll || l === 1 || states[l - 2] === 'completed')) states.push('available');
      else states.push('locked');
    }
    levelState[u.id] = states;
    if (!next && unlocked) {
      const lvl = states.indexOf('available');
      if (lvl >= 0) next = { unitId: u.id, level: lvl + 1 };
      else if (!unitMastered(u, progress)) next = { unitId: u.id, level: u.levels }; // repetir el final
    }
    mastered[u.id] = unitMastered(u, progress);
    prevMastered = unlocked && mastered[u.id]!;
  }
  return { unitUnlocked, levelState, unitMastered: mastered, next };
}
