import { db, type TildinDB } from './db';
import type { Attempt, DailyStat, LevelProgress, SessionKind, StudySession } from './types';
import type { Item } from '../core/content/schema';
import { updateMastery } from '../core/engine/mastery';
import { reviewCard } from '../core/engine/srs';
import { lessonBonus } from '../core/engine/xp';
import { toLocalDate } from '../core/time/dates';

/** Operaciones de guardado del progreso (todas locales, en IndexedDB). */

function uuid(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function emptyDay(date: string): DailyStat {
  return { date, activeSec: 0, lessons: 0, xp: 0, questions: 0, correct: 0, freezeUsed: false };
}

async function bumpDay(database: TildinDB, date: string, patch: Partial<Record<'activeSec' | 'lessons' | 'xp' | 'questions' | 'correct', number>>) {
  const day = (await database.dailyStats.get(date)) ?? emptyDay(date);
  for (const [k, v] of Object.entries(patch) as [keyof typeof patch, number][]) day[k] += v;
  await database.dailyStats.put(day);
}

export async function startSession(kind: SessionKind, unitId: string | null, level: number | null, database: TildinDB = db): Promise<string> {
  const now = new Date();
  const s: StudySession = {
    id: uuid(),
    kind,
    unitId,
    level,
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    activeSec: 0,
    questions: 0,
    correct: 0,
    xp: 0,
    skills: [],
    finished: false,
    date: toLocalDate(now),
  };
  await database.sessions.put(s);
  return s.id;
}

/** Suma segundos activos a la sesión y al día de HOY (así una sesión que cruza la medianoche se reparte). */
export async function addActiveTime(sessionId: string, sec: number, now = new Date(), database: TildinDB = db) {
  await database.transaction('rw', database.sessions, database.dailyStats, async () => {
    const s = await database.sessions.get(sessionId);
    if (s) await database.sessions.put({ ...s, activeSec: s.activeSec + sec, endedAt: now.toISOString() });
    await bumpDay(database, toLocalDate(now), { activeSec: sec });
  });
}

export interface AnswerInput {
  sessionId: string;
  item: Item;
  correct: boolean;
  given: string;
  ms: number;
  xp: number;
  /** false para los reintentos de una pregunta fallada dentro de la misma lección. */
  firstTry: boolean;
}

export async function recordAnswer(a: AnswerInput, now = new Date(), database: TildinDB = db) {
  const date = toLocalDate(now);
  await database.transaction(
    'rw',
    [database.attempts, database.skillMastery, database.srsCards, database.sessions, database.dailyStats],
    async () => {
      const attempt: Attempt = {
        itemId: a.item.id,
        sessionId: a.sessionId,
        target: a.item.correccion ?? a.item.palabra ?? String(a.item.respuesta),
        correct: a.correct,
        given: a.given,
        skills: a.item.skills,
        difficulty: a.item.dificultad,
        ms: a.ms,
        date,
        at: now.toISOString(),
      };
      await database.attempts.add(attempt);
      if (!a.firstTry) return; // los reintentos no cuentan para estadísticas ni dominio

      for (const skill of a.item.skills) {
        const m = await database.skillMastery.get(skill);
        await database.skillMastery.put({
          skill,
          mastery: updateMastery(m?.mastery ?? 0, a.correct, a.item.dificultad),
          attempts: (m?.attempts ?? 0) + 1,
          correct: (m?.correct ?? 0) + (a.correct ? 1 : 0),
          updatedAt: now.toISOString(),
        });
      }
      const card = await database.srsCards.get(a.item.id);
      const next = reviewCard(card, a.item.id, a.correct, date);
      if (next) await database.srsCards.put(next);
      else if (card) await database.srsCards.delete(a.item.id);

      const s = await database.sessions.get(a.sessionId);
      if (s) {
        await database.sessions.put({
          ...s,
          questions: s.questions + 1,
          correct: s.correct + (a.correct ? 1 : 0),
          xp: s.xp + a.xp,
          skills: [...new Set([...s.skills, ...a.item.skills])],
          endedAt: now.toISOString(),
        });
      }
      await bumpDay(database, date, { questions: 1, correct: a.correct ? 1 : 0, xp: a.xp });
    },
  );
}

/** Cierra la sesión. En lecciones, guarda el mejor resultado del nivel y suma la lección al día. */
export async function finishSession(sessionId: string, now = new Date(), database: TildinDB = db): Promise<StudySession | undefined> {
  return database.transaction('rw', [database.sessions, database.levelProgress, database.dailyStats], async () => {
    const s = await database.sessions.get(sessionId);
    if (!s || s.finished) return s;
    const pct = s.questions ? Math.round((100 * s.correct) / s.questions) : 0;
    const bonus = s.kind === 'lesson' || s.kind === 'placement' ? lessonBonus(pct) : 0;
    const done: StudySession = { ...s, finished: true, endedAt: now.toISOString(), xp: s.xp + bonus };
    await database.sessions.put(done);
    const date = toLocalDate(now);
    if (s.kind === 'lesson' && s.unitId && s.level) {
      const prev = await database.levelProgress.get([s.unitId, s.level]);
      const row: LevelProgress = {
        unitId: s.unitId,
        level: s.level,
        bestPct: Math.max(prev?.bestPct ?? 0, pct),
        completed: true,
        skipped: prev?.skipped ?? false,
        attempts: (prev?.attempts ?? 0) + 1,
        updatedAt: now.toISOString(),
      };
      await database.levelProgress.put(row);
    }
    await bumpDay(database, date, { lessons: s.kind === 'practice' ? 0 : 1, xp: bonus });
    return done;
  });
}

/** Marca todos los niveles de una unidad como superados (prueba de nivel aprobada). */
export async function skipUnit(unitId: string, levels: number, pct: number, database: TildinDB = db) {
  const now = new Date().toISOString();
  for (let l = 1; l <= levels; l++) {
    const prev = await database.levelProgress.get([unitId, l]);
    await database.levelProgress.put({
      unitId,
      level: l,
      bestPct: Math.max(prev?.bestPct ?? 0, pct),
      completed: prev?.completed ?? false,
      skipped: true,
      attempts: prev?.attempts ?? 0,
      updatedAt: now,
    });
  }
}

export async function getMasteryMap(database: TildinDB = db): Promise<Record<string, number>> {
  const rows = await database.skillMastery.toArray();
  return Object.fromEntries(rows.map((r) => [r.skill, r.mastery]));
}

export async function getDueItemIds(today = toLocalDate(), database: TildinDB = db): Promise<string[]> {
  return (await database.srsCards.where('due').belowOrEqual(today).toArray()).map((c) => c.itemId);
}

export async function getRecentItemIds(limit = 150, database: TildinDB = db): Promise<Set<string>> {
  const rows = await database.attempts.orderBy('id').reverse().limit(limit).toArray();
  return new Set(rows.map((r) => r.itemId));
}
