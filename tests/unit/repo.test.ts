import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { TildinDB } from '../../src/db/db';
import { addActiveTime, finishSession, getDueItemIds, recordAnswer, startSession } from '../../src/db/repo';
import type { Item } from '../../src/core/content/schema';

const item: Item = {
  id: 'A4-0001', tipo: 'elegir', enunciado: '¿Cuál?', palabra: 'camión', opciones: ['camión', 'camion'],
  respuesta: 'camión', dificultad: 2, skills: ['agudas'], explicacion: 'Es aguda…', regla_id: 'agudas',
};

describe('repositorio de progreso', () => {
  it('guarda respuestas, dominio, repasos y resultado del nivel', async () => {
    const db = new TildinDB('repo-1');
    const sid = await startSession('lesson', 'A4', 1, db);
    const t = new Date(2026, 4, 10, 18, 0);
    await recordAnswer({ sessionId: sid, item, correct: false, given: 'camion', ms: 3000, xp: 0, firstTry: true }, t, db);
    await recordAnswer({ sessionId: sid, item, correct: true, given: 'camión', ms: 2000, xp: 0, firstTry: false }, t, db);
    await recordAnswer({ sessionId: sid, item: { ...item, id: 'A4-0002' }, correct: true, given: 'x', ms: 2000, xp: 10, firstTry: true }, t, db);
    const s = await finishSession(sid, t, db);
    expect(s).toMatchObject({ questions: 2, correct: 1, finished: true });
    expect(s!.xp).toBe(10 + 5); // 10 de la pregunta + 5 de bonus (50 %)
    expect(await db.attempts.count()).toBe(3);
    expect((await db.skillMastery.get('agudas'))?.attempts).toBe(2);
    expect(await getDueItemIds('2026-05-11', db)).toEqual(['A4-0001']);
    expect((await db.levelProgress.get(['A4', 1]))?.bestPct).toBe(50);
    expect((await db.dailyStats.get('2026-05-10'))).toMatchObject({ lessons: 1, questions: 2, correct: 1 });
    db.close();
  });

  it('reparte el tiempo activo entre días si la sesión cruza la medianoche', async () => {
    const db = new TildinDB('repo-2');
    const sid = await startSession('practice', null, null, db);
    await addActiveTime(sid, 120, new Date(2026, 4, 10, 23, 59, 50), db);
    await addActiveTime(sid, 60, new Date(2026, 4, 11, 0, 0, 55), db);
    expect((await db.dailyStats.get('2026-05-10'))?.activeSec).toBe(120);
    expect((await db.dailyStats.get('2026-05-11'))?.activeSec).toBe(60);
    expect((await db.sessions.get(sid))?.activeSec).toBe(180);
    db.close();
  });
});
