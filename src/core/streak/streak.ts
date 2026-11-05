import { addDays, type LocalDate } from '../time/dates';
import type { DailyStat, StreakCriterion } from '../../db/types';

/**
 * Cálculo de la racha a partir del historial diario.
 *
 * Una web app no puede ejecutarse en segundo plano, así que la racha no se "rompe" a
 * medianoche: se RECALCULA cada vez que se abre la app, recorriendo los días guardados.
 * Siempre con fechas locales (zona horaria del dispositivo).
 *
 * Reglas:
 * - Un día cuenta si cumple el criterio (al menos una lección, o X minutos de estudio activo,
 *   o cualquiera de las dos cosas).
 * - Cada 7 días de racha se gana un protector (máximo 2 acumulados).
 * - Si un día no se estudia y hay protector, se gasta automáticamente y la racha sigue
 *   (ese día no suma). Si no hay protector, la racha vuelve a 0.
 * - El día de HOY aún no ha terminado: si todavía no se ha estudiado, la racha no se pierde.
 */
export interface StreakOptions {
  criterion: StreakCriterion;
  /** Minutos de estudio activo para que cuente el día (criterios "minutes" y "either"). */
  minutes: number;
}

export interface StreakResult {
  current: number;
  best: number;
  freezes: number;
  /** ¿Hoy ya cuenta para la racha? */
  todayDone: boolean;
  /** Días que contaron para la racha (cualquier racha). */
  streakDays: Set<LocalDate>;
  /** Días en los que se gastó un protector. */
  freezeDays: Set<LocalDate>;
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export function dayQualifies(d: DailyStat | undefined, o: StreakOptions): boolean {
  if (!d) return false;
  const byLesson = d.lessons >= 1;
  const byMinutes = d.activeSec >= o.minutes * 60;
  if (o.criterion === 'lesson') return byLesson;
  if (o.criterion === 'minutes') return byMinutes;
  return byLesson || byMinutes;
}

export function computeStreak(days: DailyStat[], today: LocalDate, o: StreakOptions): StreakResult {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const qualifying = days.filter((d) => dayQualifies(d, o)).map((d) => d.date).sort();
  const res: StreakResult = { current: 0, best: 0, freezes: 0, todayDone: false, streakDays: new Set(), freezeDays: new Set() };
  if (qualifying.length === 0) return res;

  let current = 0;
  let freezes = 0;
  const first = qualifying[0]!;
  // Recorremos día a día desde el primer día que contó hasta hoy.
  for (let d = first; d <= today; d = addDays(d, 1)) {
    const ok = dayQualifies(byDate.get(d), o);
    if (ok) {
      current++;
      res.streakDays.add(d);
      if (current % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (d === today) {
      // Hoy todavía se puede estudiar: no se rompe nada.
    } else if (current > 0 && freezes > 0) {
      freezes--;
      res.freezeDays.add(d);
    } else {
      current = 0;
      freezes = 0;
    }
    res.best = Math.max(res.best, current);
  }
  res.current = current;
  res.freezes = freezes;
  res.todayDone = dayQualifies(byDate.get(today), o);
  return res;
}
