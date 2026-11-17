import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { TildinDB, getSettings } from '../../src/db/db';

/**
 * Actualizar la app no debe borrar el histórico: se simula una base de datos creada por una
 * versión anterior (esquema v2) con progreso y se abre con la versión actual.
 */
describe('migración de la base de datos al actualizar', () => {
  it('conserva todo el progreso y cambia el criterio de racha antiguo por «objetivo diario»', async () => {
    const name = 'tildin-migracion';
    const old = new Dexie(name);
    old.version(1).stores({
      settings: 'id', levelProgress: '[unitId+level], unitId', skillMastery: 'skill', srsCards: 'itemId, due',
      attempts: '++id, itemId, sessionId, date, target', sessions: 'id, date, kind', dailyStats: 'date',
      streakState: 'id', achievements: 'id',
    });
    old.version(2).stores({ reports: '++id, childId, at' });
    await old.open();
    await old.table('settings').put({ id: 'main', streakCriterion: 'either', streakMinutes: 5, dailyGoalMin: 20, sound: false, theme: 'dark', pinHash: 'h', pinSalt: 's', lastBackupAt: null, createdAt: '' });
    await old.table('dailyStats').bulkPut([
      { date: '2026-11-01', activeSec: 1500, lessons: 3, xp: 200, questions: 40, correct: 35, freezeUsed: false },
      { date: '2026-11-02', activeSec: 1300, lessons: 2, xp: 150, questions: 30, correct: 27, freezeUsed: false },
    ]);
    await old.table('levelProgress').put({ unitId: 'A1', level: 1, bestPct: 90, completed: true, skipped: false, attempts: 1, updatedAt: '' });
    await old.table('achievements').put({ id: 'racha-3', unlockedAt: '' });
    old.close();

    const db = new TildinDB(name);
    const s = await getSettings(db);
    expect(s.streakCriterion).toBe('goal');
    expect(s.dailyGoalMin).toBe(20);
    expect(s.theme).toBe('dark');
    expect(s.pinHash).toBe('h');
    expect(await db.dailyStats.count()).toBe(2);
    expect((await db.levelProgress.get(['A1', 1]))?.bestPct).toBe(90);
    expect(await db.achievements.count()).toBe(1);
    db.close();
  });

  it('no cambia un criterio elegido a mano (solo lección)', async () => {
    const name = 'tildin-migracion-2';
    const old = new Dexie(name);
    old.version(1).stores({ settings: 'id' });
    await old.open();
    await old.table('settings').put({ id: 'main', streakCriterion: 'lesson', streakMinutes: 5, dailyGoalMin: 10 });
    old.close();
    const db = new TildinDB(name);
    expect((await getSettings(db)).streakCriterion).toBe('lesson');
    db.close();
  });
});
