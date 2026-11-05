import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { updateMastery } from '../../src/core/engine/mastery';
import { reviewCard } from '../../src/core/engine/srs';
import { xpFor } from '../../src/core/engine/xp';
import { buildLesson, buildPractice, levelBand } from '../../src/core/engine/lessonBuilder';
import { computePath } from '../../src/core/engine/unlock';
import { UNITS } from '../../src/core/content/catalog';
import { UnitFileSchema } from '../../src/core/content/schema';
import { addDays, daysBetween, toLocalDate } from '../../src/core/time/dates';
import type { LevelProgress } from '../../src/db/types';

const load = (u: string) =>
  UnitFileSchema.parse(JSON.parse(readFileSync(new URL(`../../public/content/${u}.json`, import.meta.url), 'utf8'))).items;

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe('dominio', () => {
  it('sube con aciertos y baja con fallos, entre 0 y 100', () => {
    let m = 0;
    for (let i = 0; i < 50; i++) m = updateMastery(m, true, 3);
    expect(m).toBeGreaterThan(95);
    expect(m).toBeLessThanOrEqual(100);
    const after = updateMastery(m, false, 1);
    expect(after).toBeLessThan(m);
  });
  it('un acierto difícil vale más que uno fácil; un fallo fácil resta más', () => {
    expect(updateMastery(50, true, 5)).toBeGreaterThan(updateMastery(50, true, 1));
    expect(updateMastery(50, false, 1)).toBeLessThan(updateMastery(50, false, 5));
  });
});

describe('repetición espaciada (Leitner)', () => {
  const today = '2026-03-10';
  it('solo crea tarjeta al fallar', () => {
    expect(reviewCard(undefined, 'x', true, today)).toBeNull();
    expect(reviewCard(undefined, 'x', false, today)).toMatchObject({ box: 1, due: '2026-03-11' });
  });
  it('sube de caja al acertar y se gradúa al final', () => {
    let c = reviewCard(undefined, 'x', false, today)!;
    c = reviewCard(c, 'x', true, today)!;
    expect(c).toMatchObject({ box: 2, due: '2026-03-12' });
    c = reviewCard(c, 'x', true, today)!;
    c = reviewCard(c, 'x', true, today)!;
    c = reviewCard(c, 'x', true, today)!;
    expect(c.box).toBe(5);
    expect(reviewCard(c, 'x', true, today)).toBeNull();
  });
  it('un fallo devuelve a la caja 1', () => {
    const c = { itemId: 'x', box: 4, due: today, lapses: 1, lastSeen: today };
    expect(reviewCard(c, 'x', false, today)).toMatchObject({ box: 1, lapses: 2 });
  });
});

describe('XP', () => {
  it('multiplica por dificultad y da bonus por combo', () => {
    expect(xpFor(1, 0)).toBe(5);
    expect(xpFor(4, 0)).toBe(20);
    expect(xpFor(4, 5)).toBe(30);
  });
});

describe('fechas locales', () => {
  it('suma días cruzando el cambio de hora', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });
  it('toLocalDate usa la fecha local', () => {
    expect(toLocalDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    expect(toLocalDate(new Date(2025, 11, 31, 23, 59))).toBe('2025-12-31');
  });
});

describe('generador de lecciones', () => {
  const a4 = load('A4');
  it('da 12 preguntas sin palabras repetidas', () => {
    const l = buildLesson({ unitItems: a4, level: 1, levels: 4, mastery: {}, dueItems: [], reviewPool: [], random: seeded(2) });
    expect(l).toHaveLength(12);
    expect(new Set(l.map((i) => i.palabra)).size).toBe(12);
  });
  it('el nivel 1 usa las preguntas más fáciles', () => {
    const [lo, hi] = levelBand(a4, 1, 4);
    const l = buildLesson({ unitItems: a4, level: 1, levels: 4, mastery: {}, dueItems: [], reviewPool: [], random: seeded(3) });
    for (const it of l) expect(it.dificultad >= lo && it.dificultad <= hi).toBe(true);
  });
  it('incluye repasos pendientes y de unidades anteriores', () => {
    const a3 = load('A3');
    const due = a3.slice(0, 5);
    const review = a3.slice(10, 30);
    const l = buildLesson({ unitItems: a4, level: 2, levels: 4, mastery: {}, dueItems: due, reviewPool: review, random: seeded(4) });
    const ids = new Set(l.map((i) => i.id));
    expect(due.some((d) => ids.has(d.id))).toBe(true);
    expect(review.some((d) => ids.has(d.id))).toBe(true);
  });
  it('con más dominio se eligen preguntas más difíciles', () => {
    const avg = (m: number) => {
      let total = 0;
      for (let s = 1; s <= 10; s++) {
        const l = buildLesson({ unitItems: a4, level: 4, levels: 4, mastery: { agudas: m, reglas: m }, dueItems: [], reviewPool: [], random: seeded(s) });
        total += l.reduce((a, i) => a + i.dificultad, 0) / l.length;
      }
      return total / 10;
    };
    expect(avg(90)).toBeGreaterThanOrEqual(avg(0));
  });
  it('práctica libre prioriza lo que más cuesta', () => {
    const p = buildPractice([...a4, ...load('A5')], { agudas: 95, llanas: 5 }, [], 10, seeded(5));
    expect(p).toHaveLength(10);
    const llanas = p.filter((i) => i.skills.includes('llanas')).length;
    expect(llanas).toBeGreaterThan(5);
  });
});

describe('desbloqueo del camino', () => {
  const playable = new Set(UNITS.map((u) => u.id));
  const row = (unitId: string, level: number, bestPct: number): LevelProgress => ({
    unitId, level, bestPct, completed: true, skipped: false, attempts: 1, updatedAt: '',
  });
  it('al principio solo está disponible A1 nivel 1', () => {
    const p = computePath(UNITS, [], playable);
    expect(p.unitUnlocked['A1']).toBe(true);
    expect(p.unitUnlocked['A2']).toBe(false);
    expect(p.levelState['A1']).toEqual(['available', 'locked', 'locked', 'locked']);
    expect(p.next).toEqual({ unitId: 'A1', level: 1 });
  });
  it('la unidad siguiente se abre con ≥ 80 % en el nivel final', () => {
    const base = [row('A1', 1, 50), row('A1', 2, 60), row('A1', 3, 70)];
    expect(computePath(UNITS, [...base, row('A1', 4, 75)], playable).unitUnlocked['A2']).toBe(false);
    const ok = computePath(UNITS, [...base, row('A1', 4, 80)], playable);
    expect(ok.unitUnlocked['A2']).toBe(true);
    expect(ok.next).toEqual({ unitId: 'A2', level: 1 });
  });
  it('si el nivel final no llega al 80 %, se propone repetirlo', () => {
    const rows = [row('A1', 1, 90), row('A1', 2, 90), row('A1', 3, 90), row('A1', 4, 60)];
    expect(computePath(UNITS, rows, playable).next).toEqual({ unitId: 'A1', level: 4 });
  });
  it('las unidades sin contenido no se desbloquean', () => {
    const rows = [1, 2, 3, 4].map((l) => row('A1', l, 100));
    const p = computePath(UNITS, rows, new Set(['A1']));
    expect(p.unitUnlocked['A2']).toBe(false);
  });
});
