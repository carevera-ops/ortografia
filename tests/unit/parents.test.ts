import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { checkPin, hashPin, isValidPin, newSalt } from '../../src/core/parents/pin';
import { backupDue, describeBackup, exportBackup, importBackup, parseBackup, resetProgress } from '../../src/db/backup';
import { TildinDB, getSettings, updateSettings } from '../../src/db/db';
import { ACHIEVEMENTS, newAchievements, type AchievementContext } from '../../src/core/achievements/achievements';
import type { DailyStat } from '../../src/db/types';

describe('PIN de padres', () => {
  it('valida 4 dígitos', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
  it('comprueba el PIN con hash y sal (sin guardarlo en claro)', async () => {
    const salt = newSalt();
    const hash = await hashPin('4321', salt);
    expect(hash).not.toContain('4321');
    expect(await checkPin('4321', salt, hash)).toBe(true);
    expect(await checkPin('1234', salt, hash)).toBe(false);
    expect(await checkPin('4321', null, null)).toBe(false);
    expect(await hashPin('4321', newSalt())).not.toBe(hash);
  });
});

const day = (date: string, extra: Partial<DailyStat> = {}): DailyStat => ({
  date, activeSec: 600, lessons: 2, xp: 100, questions: 24, correct: 20, freezeUsed: false, ...extra,
});

describe('copia de seguridad', () => {
  it('exporta, valida e importa (ida y vuelta)', async () => {
    const a = new TildinDB('backup-a');
    await getSettings(a);
    await updateSettings({ dailyGoalMin: 20, pinHash: 'h', pinSalt: 's' }, a);
    await a.dailyStats.bulkPut([day('2026-05-01'), day('2026-05-02')]);
    await a.levelProgress.put({ unitId: 'A1', level: 1, bestPct: 90, completed: true, skipped: false, attempts: 1, updatedAt: '' });
    await a.attempts.add({ itemId: 'A1-0001', sessionId: 's', target: 'casa', correct: false, given: 'c-asa', skills: ['silabas'], difficulty: 1, ms: 100, date: '2026-05-01', at: '' });
    const backup = await exportBackup(a);
    const text = JSON.stringify(backup);

    const b = new TildinDB('backup-b');
    await importBackup(parseBackup(text), b);
    expect(await b.dailyStats.count()).toBe(2);
    expect((await b.levelProgress.get(['A1', 1]))?.bestPct).toBe(90);
    expect((await b.attempts.toArray())[0]?.target).toBe('casa');
    expect((await getSettings(b)).dailyGoalMin).toBe(20);
    expect(describeBackup(backup)).toMatchObject({ days: 2, lessons: 4, xp: 200 });
    a.close();
    b.close();
  });

  it('rechaza archivos que no son copias de Tildín', () => {
    expect(() => parseBackup('hola')).toThrow(/no es JSON/);
    expect(() => parseBackup('{"app":"otra"}')).toThrow(/no es una copia/);
    expect(() => parseBackup(JSON.stringify({ app: 'tildin', version: 99, exportedAt: '', tables: {} }))).toThrow();
  });

  it('reiniciar el progreso conserva los ajustes y el PIN', async () => {
    const d = new TildinDB('reset');
    await updateSettings({ pinHash: 'x', pinSalt: 'y', dailyGoalMin: 30 }, d);
    await d.dailyStats.put(day('2026-05-01'));
    await resetProgress(d);
    expect(await d.dailyStats.count()).toBe(0);
    expect((await getSettings(d)).pinHash).toBe('x');
    d.close();
  });

  it('recordatorio de copia: tras 14 días o si nunca se hizo', () => {
    const now = new Date('2026-05-30T12:00:00');
    expect(backupDue(null, 1, now)).toBe(false); // aún no hay progreso que perder
    expect(backupDue(null, 5, now)).toBe(true);
    expect(backupDue('2026-05-20T12:00:00', 5, now)).toBe(false);
    expect(backupDue('2026-05-10T12:00:00', 5, now)).toBe(true);
  });
});

describe('insignias', () => {
  const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({ days: [], skills: [], sessions: [], levels: [], bestStreak: 0, ...over });
  it('ids únicos', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('sin actividad no hay insignias', () => {
    expect(newAchievements(ctx(), new Set())).toEqual([]);
  });
  it('primera lección, racha de 7 días y 100 esdrújulas', () => {
    const got = newAchievements(
      ctx({ days: [day('2026-05-01')], bestStreak: 7, skills: [{ skill: 'esdrujulas', mastery: 80, attempts: 120, correct: 100, updatedAt: '' }] }),
      new Set(),
    ).map((a) => a.id);
    expect(got).toEqual(expect.arrayContaining(['primera-leccion', 'racha-3', 'racha-7', 'esdrujulas-100']));
    expect(got).not.toContain('racha-30');
  });
  it('no repite las que ya se tienen', () => {
    expect(newAchievements(ctx({ days: [day('2026-05-01')] }), new Set(['primera-leccion']))).toEqual([]);
  });
  it('maestro de la diacrítica exige más del 85 %', () => {
    const k = (correct: number, attempts: number) => ctx({ skills: [{ skill: 'diacritica', mastery: 0, attempts, correct, updatedAt: '' }] });
    expect(newAchievements(k(50, 70), new Set()).map((a) => a.id)).not.toContain('maestro-diacritica');
    expect(newAchievements(k(55, 60), new Set()).map((a) => a.id)).toContain('maestro-diacritica');
  });
  it('día de campeón', () => {
    const got = newAchievements(ctx({ days: [day('2026-05-01', { activeSec: 1300, questions: 40, correct: 38 })] }), new Set());
    expect(got.map((a) => a.id)).toContain('campeon');
  });
});
