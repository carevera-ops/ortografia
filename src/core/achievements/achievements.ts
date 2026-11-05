import type { DailyStat, LevelProgress, SkillMastery, StudySession } from '../../db/types';
import { isChampionDay } from '../streak/champion';
import { UNITS } from '../content/catalog';
import { PASS_PCT } from '../engine/unlock';

/** Datos con los que se evalúan las insignias. */
export interface AchievementContext {
  days: DailyStat[];
  skills: SkillMastery[];
  sessions: StudySession[];
  levels: LevelProgress[];
  bestStreak: number;
}

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (c: AchievementContext) => boolean;
}

const skillCorrect = (c: AchievementContext, s: string) => c.skills.find((k) => k.skill === s)?.correct ?? 0;
const skillPct = (c: AchievementContext, s: string) => {
  const k = c.skills.find((x) => x.skill === s);
  return k && k.attempts ? (100 * k.correct) / k.attempts : 0;
};
const sum = (c: AchievementContext, f: (d: DailyStat) => number) => c.days.reduce((a, d) => a + f(d), 0);
const unitPassed = (c: AchievementContext, unitId: string, levels: number) =>
  c.levels.some((l) => l.unitId === unitId && l.level === levels && l.completed && l.bestPct >= PASS_PCT);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primera-leccion', emoji: '🌱', title: 'Primer paso', description: 'Termina tu primera lección.', check: (c) => sum(c, (d) => d.lessons) >= 1 },
  { id: 'leccion-perfecta', emoji: '💯', title: 'Lección perfecta', description: 'Acierta todas las preguntas de una lección.', check: (c) => c.sessions.some((s) => s.kind === 'lesson' && s.finished && s.questions >= 10 && s.correct === s.questions) },
  { id: 'racha-3', emoji: '🔥', title: 'En marcha', description: 'Consigue una racha de 3 días.', check: (c) => c.bestStreak >= 3 },
  { id: 'racha-7', emoji: '📅', title: 'Primera semana', description: 'Consigue una racha de 7 días.', check: (c) => c.bestStreak >= 7 },
  { id: 'racha-30', emoji: '🌟', title: 'Un mes entero', description: 'Consigue una racha de 30 días.', check: (c) => c.bestStreak >= 30 },
  { id: 'campeon', emoji: '🏆', title: 'Día de campeón', description: 'Estudia 20 minutos en un día con más del 90 % de aciertos.', check: (c) => c.days.some(isChampionDay) },
  { id: 'esdrujulas-100', emoji: '🎵', title: '100 esdrújulas', description: 'Acierta 100 preguntas de esdrújulas.', check: (c) => skillCorrect(c, 'esdrujulas') >= 100 },
  { id: 'agudas-100', emoji: '🎯', title: 'Puntería aguda', description: 'Acierta 100 preguntas de agudas.', check: (c) => skillCorrect(c, 'agudas') >= 100 },
  { id: 'hiatos-50', emoji: '🦉', title: 'Cazahiatos', description: 'Acierta 50 preguntas de hiatos.', check: (c) => skillCorrect(c, 'hiatos') >= 50 },
  { id: 'maestro-diacritica', emoji: '⚖️', title: 'Maestro de la tilde diacrítica', description: 'Acierta 50 preguntas de tilde diacrítica con más de un 85 %.', check: (c) => skillCorrect(c, 'diacritica') >= 50 && skillPct(c, 'diacritica') > 85 },
  { id: 'dictado-25', emoji: '🎧', title: 'Buen oído', description: 'Acierta 25 dictados.', check: (c) => skillCorrect(c, 'dictado') >= 25 },
  { id: 'respuestas-500', emoji: '🧠', title: '500 aciertos', description: 'Acierta 500 preguntas en total.', check: (c) => sum(c, (d) => d.correct) >= 500 },
  { id: 'xp-1000', emoji: '⭐', title: '1.000 XP', description: 'Consigue 1.000 puntos de experiencia.', check: (c) => sum(c, (d) => d.xp) >= 1000 },
  { id: 'xp-5000', emoji: '🌠', title: '5.000 XP', description: 'Consigue 5.000 puntos de experiencia.', check: (c) => sum(c, (d) => d.xp) >= 5000 },
  { id: 'horas-5', emoji: '⏱️', title: 'Cinco horas', description: 'Estudia 5 horas en total.', check: (c) => sum(c, (d) => d.activeSec) >= 5 * 3600 },
  { id: 'primera-unidad', emoji: '🗝️', title: 'Unidad superada', description: 'Supera el repaso final de una unidad.', check: (c) => UNITS.some((u) => unitPassed(c, u.id, u.levels)) },
  { id: 'maestro-tilde', emoji: '👑', title: 'Maestro de la tilde', description: 'Supera todas las unidades de acentuación.', check: (c) => UNITS.filter((u) => u.block === 'A').every((u) => unitPassed(c, u.id, u.levels)) },
  { id: 'maestro-ortografia', emoji: '📚', title: 'Maestro de la ortografía', description: 'Supera todas las unidades de ortografía general.', check: (c) => UNITS.filter((u) => u.block === 'B').every((u) => unitPassed(c, u.id, u.levels)) },
];

/** Insignias conseguidas que aún no estaban guardadas. */
export function newAchievements(c: AchievementContext, have: Set<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(c));
}
