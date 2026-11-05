import type { Item } from '../content/schema';

/**
 * Adaptación DENTRO de la lección.
 * - Con 3 aciertos seguidos, la siguiente pregunta de la unidad se cambia por una más difícil
 *   (+1; con 6 seguidos, +2). Así, si siempre acierta, la lección se va poniendo más exigente.
 * - Con 2 fallos seguidos, se cambia por una más fácil (−1), para no frustrar.
 * Solo se cambian preguntas "principales" de la unidad (no los repasos) que aún no se han hecho.
 */
export interface QueueEntry {
  item: Item;
  firstTry: boolean;
  /** main = de la unidad de la lección; extra = repasos (no se tocan). */
  role: 'main' | 'extra';
  /** Marcada si entró por la adaptación (para mostrar un aviso). */
  adapted?: 'up' | 'down';
}

export const HOT_STREAK = 3;
export const VERY_HOT_STREAK = 6;
export const COLD_STREAK = 2;

export const wordKey = (it: Item) => (it.palabra ?? it.frase ?? it.id).toLowerCase();

/** Dirección del cambio según las rachas de aciertos y fallos. */
export function adaptationDelta(correctStreak: number, wrongStreak: number): number {
  if (correctStreak >= VERY_HOT_STREAK) return 2;
  if (correctStreak >= HOT_STREAK) return 1;
  if (wrongStreak >= COLD_STREAK) return -1;
  return 0;
}

/**
 * Devuelve la cola con la pregunta de la posición `nextPos` cambiada si toca.
 * @param reserve preguntas candidatas (normalmente, toda la unidad)
 * @param used palabras ya usadas en la lección (para no repetir)
 */
export function adaptQueue(
  queue: QueueEntry[],
  nextPos: number,
  reserve: Item[],
  correctStreak: number,
  wrongStreak: number,
  used: Set<string>,
  random: () => number = Math.random,
): QueueEntry[] {
  const delta = adaptationDelta(correctStreak, wrongStreak);
  const entry = queue[nextPos];
  if (!delta || !entry || entry.role !== 'main' || !entry.firstTry) return queue;
  const base = entry.item.dificultad;
  const upcoming = new Set(queue.slice(nextPos).map((e) => wordKey(e.item)));
  const candidates = reserve.filter((it) => !used.has(wordKey(it)) && !upcoming.has(wordKey(it)));
  let pickFrom: Item[] = [];
  if (delta > 0) {
    // La más cercana a base+delta que sea estrictamente más difícil.
    for (let d = base + delta; d >= base + 1 && pickFrom.length === 0; d--) pickFrom = candidates.filter((c) => c.dificultad === d);
    if (pickFrom.length === 0) pickFrom = candidates.filter((c) => c.dificultad > base);
  } else {
    pickFrom = candidates.filter((c) => c.dificultad === base - 1);
    if (pickFrom.length === 0) pickFrom = candidates.filter((c) => c.dificultad < base);
  }
  if (pickFrom.length === 0) return queue;
  const chosen = pickFrom[Math.floor(random() * pickFrom.length)]!;
  const out = [...queue];
  out[nextPos] = { item: chosen, firstTry: true, role: 'main', adapted: delta > 0 ? 'up' : 'down' };
  return out;
}

/** Porcentaje necesario en la prueba de nivel para saltar la unidad. */
export const PLACEMENT_PASS = 85;
export const PLACEMENT_SIZE = 15;

/**
 * Prueba de nivel: 15 preguntas de toda la unidad, con más peso de las difíciles
 * y variedad de tipos de ejercicio.
 */
export function buildPlacement(unitItems: Item[], size = PLACEMENT_SIZE, random: () => number = Math.random): Item[] {
  const shuffled = [...unitItems].sort(() => random() - 0.5);
  const maxD = Math.max(...unitItems.map((i) => i.dificultad));
  // Dos tercios de dificultad alta (las dos más altas de la unidad), un tercio del resto.
  const high = shuffled.filter((i) => i.dificultad >= maxD - 1);
  const rest = shuffled.filter((i) => i.dificultad < maxD - 1);
  const out: Item[] = [];
  const words = new Set<string>();
  const types = new Map<string, number>();
  const take = (pool: Item[], n: number) => {
    // Primero un ejercicio de cada tipo; luego, lo que falte.
    for (const pass of [0, 1]) {
      for (const it of pool) {
        if (n <= 0) return;
        if (words.has(wordKey(it))) continue;
        if (pass === 0 && (types.get(it.tipo) ?? 0) >= 2) continue;
        words.add(wordKey(it));
        types.set(it.tipo, (types.get(it.tipo) ?? 0) + 1);
        out.push(it);
        n--;
      }
    }
  };
  take(high, Math.round((size * 2) / 3));
  take(rest, size - out.length);
  take(shuffled, size - out.length);
  return out.sort((a, b) => a.dificultad - b.dificultad);
}
