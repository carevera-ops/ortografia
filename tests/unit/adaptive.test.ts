import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { adaptQueue, adaptationDelta, buildPlacement, wordKey, type QueueEntry } from '../../src/core/engine/adaptive';
import { buildLesson } from '../../src/core/engine/lessonBuilder';
import { UnitFileSchema, type Item } from '../../src/core/content/schema';

const load = (u: string) =>
  UnitFileSchema.parse(JSON.parse(readFileSync(new URL(`../../public/content/${u}.json`, import.meta.url), 'utf8'))).items;
function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const avg = (xs: Item[]) => xs.reduce((a, i) => a + i.dificultad, 0) / xs.length;

/** Simula una lección respondiendo con la función `answer` y devuelve las preguntas hechas. */
function simulate(unit: Item[], answer: (it: Item, i: number) => boolean, seed = 1): Item[] {
  const rnd = seeded(seed);
  const plan = buildLesson({ unitItems: unit, level: 1, levels: 4, mastery: {}, dueItems: [], reviewPool: [], random: rnd });
  let queue: QueueEntry[] = plan.map((item) => ({ item, firstTry: true, role: 'main' }));
  const used = new Set<string>();
  const done: Item[] = [];
  let ok = 0;
  let ko = 0;
  for (let pos = 0; pos < queue.length; pos++) {
    const it = queue[pos]!.item;
    used.add(wordKey(it));
    done.push(it);
    const correct = answer(it, pos);
    ok = correct ? ok + 1 : 0;
    ko = correct ? 0 : ko + 1;
    queue = adaptQueue(queue, pos + 1, unit, ok, ko, used, rnd);
  }
  return done;
}

describe('adaptación dentro de la lección', () => {
  it('rachas → dirección', () => {
    expect(adaptationDelta(0, 0)).toBe(0);
    expect(adaptationDelta(3, 0)).toBe(1);
    expect(adaptationDelta(6, 0)).toBe(2);
    expect(adaptationDelta(0, 2)).toBe(-1);
  });

  it('si siempre acierta, la dificultad sube a lo largo de la lección', () => {
    const a4 = load('A4');
    for (const seed of [1, 2, 3, 4, 5]) {
      const done = simulate(a4, () => true, seed);
      const first = done.slice(0, 4);
      const last = done.slice(-4);
      expect(avg(last), `semilla ${seed}`).toBeGreaterThan(avg(first));
      expect(Math.max(...done.map((d) => d.dificultad))).toBeGreaterThanOrEqual(3);
    }
  });

  it('acertando siempre, la lección es más difícil que fallando siempre', () => {
    const a5 = load('A5');
    const allRight = simulate(a5, () => true, 7);
    const allWrong = simulate(a5, () => false, 7);
    expect(avg(allRight)).toBeGreaterThan(avg(allWrong));
  });

  it('no repite palabras ni toca los repasos', () => {
    const a4 = load('A4');
    const extra: QueueEntry = { item: load('A3')[0]!, firstTry: true, role: 'extra' };
    const q: QueueEntry[] = [{ item: a4[0]!, firstTry: true, role: 'main' }, extra];
    expect(adaptQueue(q, 1, a4, 5, 0, new Set())).toBe(q);
    const done = simulate(a4, () => true, 9);
    expect(new Set(done.map(wordKey)).size).toBe(done.length);
  });
});

describe('margen del nivel según el dominio', () => {
  it('con dominio alto, el nivel 1 admite preguntas más difíciles', () => {
    const a4 = load('A4');
    const maxOf = (m: number) => {
      let mx = 0;
      for (let s = 1; s <= 8; s++) {
        const l = buildLesson({ unitItems: a4, level: 1, levels: 4, mastery: { agudas: m, reglas: m }, dueItems: [], reviewPool: [], random: seeded(s) });
        mx = Math.max(mx, ...l.map((i) => i.dificultad));
      }
      return mx;
    };
    expect(maxOf(90)).toBeGreaterThan(maxOf(0));
  });
});

describe('prueba de nivel', () => {
  it('15 preguntas, sin palabras repetidas, con peso de las difíciles y varios tipos', () => {
    const a4 = load('A4');
    const p = buildPlacement(a4, 15, seeded(3));
    expect(p).toHaveLength(15);
    expect(new Set(p.map(wordKey)).size).toBe(15);
    expect(avg(p)).toBeGreaterThan(avg(a4));
    expect(new Set(p.map((i) => i.tipo)).size).toBeGreaterThanOrEqual(2);
  });
});
