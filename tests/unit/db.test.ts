import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { TildinDB, getSettings, updateSettings } from '../../src/db/db';

describe('base de datos', () => {
  it('crea los ajustes por defecto y los actualiza', async () => {
    const db = new TildinDB('test-settings');
    const s = await getSettings(db);
    expect(s.streakCriterion).toBe('lesson');
    expect(s.dailyGoalMin).toBe(10);
    await updateSettings({ dailyGoalMin: 20, sound: false }, db);
    const s2 = await getSettings(db);
    expect(s2.dailyGoalMin).toBe(20);
    expect(s2.sound).toBe(false);
    db.close();
  });

  it('usa clave compuesta en el progreso de niveles', async () => {
    const db = new TildinDB('test-levels');
    const base = { bestPct: 90, completed: true, skipped: false, attempts: 1, updatedAt: '' };
    await db.levelProgress.put({ unitId: 'A1', level: 1, ...base });
    await db.levelProgress.put({ unitId: 'A1', level: 2, ...base });
    expect(await db.levelProgress.where('unitId').equals('A1').count()).toBe(2);
    expect((await db.levelProgress.get(['A1', 2]))?.bestPct).toBe(90);
    db.close();
  });
});
