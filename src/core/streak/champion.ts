import type { DailyStat } from '../../db/types';

/** «Día de campeón»: al menos 20 minutos de estudio activo con más de un 90 % de aciertos. */
export const CHAMPION_MINUTES = 20;
export const CHAMPION_PCT = 90;
/** Mínimo de preguntas para que el porcentaje sea representativo. */
export const CHAMPION_MIN_QUESTIONS = 20;

export function isChampionDay(d: DailyStat | undefined): boolean {
  if (!d || d.questions < CHAMPION_MIN_QUESTIONS) return false;
  return d.activeSec >= CHAMPION_MINUTES * 60 && (100 * d.correct) / d.questions > CHAMPION_PCT;
}
