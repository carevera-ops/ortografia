import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { computeStreak, dayQualifies, type StreakOptions } from '../../src/core/streak/streak';
import { isChampionDay } from '../../src/core/streak/champion';
import { addDays, toLocalDate } from '../../src/core/time/dates';
import type { DailyStat } from '../../src/db/types';
import { TildinDB } from '../../src/db/db';
import { finishSession, recordAnswer, startSession } from '../../src/db/repo';

const day = (date: string, lessons = 1, activeSec = 0): DailyStat => ({
  date, activeSec, lessons, xp: 10, questions: 10, correct: 8, freezeUsed: false,
});
/** n días seguidos estudiando desde `start`. */
const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => day(addDays(start, i)));
const OPT: StreakOptions = { criterion: 'either', minutes: 5 };

describe('criterio del día', () => {
  it('lección, minutos o cualquiera de los dos', () => {
    const onlyMin = day('2026-01-01', 0, 300);
    const onlyLesson = day('2026-01-01', 1, 10);
    expect(dayQualifies(onlyMin, OPT)).toBe(true);
    expect(dayQualifies(onlyLesson, OPT)).toBe(true);
    expect(dayQualifies(onlyMin, { criterion: 'lesson', minutes: 5 })).toBe(false);
    expect(dayQualifies(onlyLesson, { criterion: 'minutes', minutes: 5 })).toBe(false);
    expect(dayQualifies(day('2026-01-01', 0, 299), OPT)).toBe(false);
  });
});

describe('racha', () => {
  it('sin historial: 0', () => {
    expect(computeStreak([], '2026-05-10', OPT)).toMatchObject({ current: 0, best: 0, freezes: 0, todayDone: false });
  });

  it('días seguidos', () => {
    const r = computeStreak(run('2026-05-01', 5), '2026-05-05', OPT);
    expect(r).toMatchObject({ current: 5, best: 5, todayDone: true });
  });

  it('si hoy aún no se ha estudiado, la racha sigue viva', () => {
    const r = computeStreak(run('2026-05-01', 5), '2026-05-06', OPT);
    expect(r).toMatchObject({ current: 5, todayDone: false });
  });

  it('un día saltado sin protector rompe la racha', () => {
    const days = [...run('2026-05-01', 3), ...run('2026-05-05', 2)];
    const r = computeStreak(days, '2026-05-06', OPT);
    expect(r.current).toBe(2);
    expect(r.best).toBe(3);
  });

  it('se gana un protector cada 7 días (máximo 2)', () => {
    expect(computeStreak(run('2026-05-01', 7), '2026-05-07', OPT).freezes).toBe(1);
    expect(computeStreak(run('2026-05-01', 14), '2026-05-14', OPT).freezes).toBe(2);
    expect(computeStreak(run('2026-05-01', 30), '2026-05-30', OPT).freezes).toBe(2);
  });

  it('el protector se gasta solo al saltar un día y la racha continúa', () => {
    const days = [...run('2026-05-01', 7), ...run('2026-05-09', 2)]; // falta el día 8
    const r = computeStreak(days, '2026-05-10', OPT);
    expect(r.current).toBe(9);
    expect(r.freezes).toBe(0);
    expect([...r.freezeDays]).toEqual(['2026-05-08']);
  });

  it('dos días saltados con dos protectores', () => {
    const days = [...run('2026-05-01', 14), ...run('2026-05-17', 1)]; // faltan 15 y 16
    const r = computeStreak(days, '2026-05-17', OPT);
    expect(r.current).toBe(15);
    expect(r.freezeDays.size).toBe(2);
  });

  it('más días saltados que protectores: racha a 0', () => {
    const days = [...run('2026-05-01', 7), ...run('2026-05-11', 1)]; // faltan 8, 9 y 10
    const r = computeStreak(days, '2026-05-11', OPT);
    expect(r.current).toBe(1);
    expect(r.best).toBe(7);
  });

  it('racha rota hace tiempo y sin estudiar hoy: 0', () => {
    expect(computeStreak(run('2026-05-01', 3), '2026-05-10', OPT).current).toBe(0);
  });

  it('cruza el cambio al horario de verano (29-03-2026) sin perder días', () => {
    const r = computeStreak(run('2026-03-26', 7), '2026-04-01', OPT);
    expect(r.current).toBe(7);
  });

  it('cruza el cambio al horario de invierno (25-10-2026) sin perder días', () => {
    const r = computeStreak(run('2026-10-22', 7), '2026-10-28', OPT);
    expect(r.current).toBe(7);
  });

  it('cruza fin de año y años bisiestos', () => {
    expect(computeStreak(run('2027-12-28', 6), '2028-01-02', OPT).current).toBe(6);
    expect(computeStreak(run('2028-02-27', 4), '2028-03-01', OPT).current).toBe(4);
  });
});

describe('medianoche y fechas locales', () => {
  it('las 23:59 y las 00:01 son días distintos (hora local)', () => {
    expect(toLocalDate(new Date(2026, 4, 10, 23, 59))).toBe('2026-05-10');
    expect(toLocalDate(new Date(2026, 4, 11, 0, 1))).toBe('2026-05-11');
  });
  it('la noche del cambio de hora se cuenta como un único día', () => {
    // Comprobamos que los tests corren con la zona horaria de Madrid (UTC+1 → UTC+2).
    expect(new Date(2026, 2, 29, 1, 59).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 3, 1).getTimezoneOffset()).toBe(-120);
    expect(toLocalDate(new Date(2026, 2, 29, 1, 59))).toBe('2026-03-29');
    expect(toLocalDate(new Date(2026, 2, 29, 3, 1))).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });

  it('lección justo antes y justo después de medianoche: dos días de racha', async () => {
    const db = new TildinDB('streak-midnight');
    const item = { id: 'A1-0001', tipo: 'separar' as const, enunciado: 'xxx', palabra: 'casa', respuesta: [2], dificultad: 1, skills: ['silabas'], explicacion: 'xxxxx', regla_id: 'silabas' };
    for (const t of [new Date(2026, 4, 10, 23, 58), new Date(2026, 4, 11, 0, 2)]) {
      const sid = await startSession('lesson', 'A1', 1, db);
      await recordAnswer({ sessionId: sid, item, correct: true, given: 'ca-sa', ms: 1000, xp: 5, firstTry: true }, t, db);
      await finishSession(sid, new Date(t.getTime() + 60_000), db);
    }
    const days = await db.dailyStats.toArray();
    expect(days.map((d) => d.date).sort()).toEqual(['2026-05-10', '2026-05-11']);
    expect(computeStreak(days, '2026-05-11', OPT).current).toBe(2);
    db.close();
  });
});

describe('día de campeón (20 min y > 90 %)', () => {
  const d = (min: number, q: number, c: number): DailyStat => ({ date: '2026-05-10', activeSec: min * 60, lessons: 2, xp: 0, questions: q, correct: c, freezeUsed: false });
  it('se cumple con 20 min y más del 90 %', () => {
    expect(isChampionDay(d(20, 50, 46))).toBe(true);
  });
  it('no con menos tiempo, con un 90 % justo o con pocas preguntas', () => {
    expect(isChampionDay(d(19, 50, 49))).toBe(false);
    expect(isChampionDay(d(25, 50, 45))).toBe(false);
    expect(isChampionDay(d(25, 10, 10))).toBe(false);
  });
});
