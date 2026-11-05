import type { Item } from '../content/schema';
import { targetDifficulty } from './mastery';

export const LESSON_SIZE = 12;

export interface BuildOptions {
  /** Ítems de la unidad de la lección. */
  unitItems: Item[];
  level: number;
  levels: number;
  /** Dominio (0–100) por habilidad. */
  mastery: Record<string, number>;
  /** Ítems con repaso pendiente (repetición espaciada), de cualquier unidad desbloqueada. */
  dueItems: Item[];
  /** Ítems de unidades anteriores, para repasar. */
  reviewPool: Item[];
  /** Ítems vistos recientemente (se evitan si hay alternativas). */
  recentIds?: Set<string>;
  size?: number;
  random?: () => number;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Dominio medio de las habilidades de un ítem. */
export function itemMastery(item: Item, mastery: Record<string, number>): number {
  const vals = item.skills.map((s) => mastery[s] ?? 0);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Rango de dificultad de cada nivel dentro de la unidad.
 * El nivel 1 usa las preguntas más fáciles de la unidad y el último, todas (es el "examen").
 */
export function levelBand(unitItems: Item[], level: number, levels: number): [number, number] {
  const diffs = unitItems.map((i) => i.dificultad);
  const min = Math.min(...diffs);
  const max = Math.max(...diffs);
  if (level >= levels) return [min, max];
  const span = max - min;
  const lo = min + Math.floor((span * (level - 1)) / Math.max(1, levels - 1));
  const hi = Math.min(max, lo + 1);
  return [lo, hi];
}

/**
 * Genera una lección adaptativa:
 * - ~65 % de la unidad, centrada en una dificultad ligeramente superior al dominio actual
 *   (dentro de la banda del nivel);
 * - ~20 % de repasos pendientes (repetición espaciada);
 * - ~15 % de repaso de unidades anteriores.
 * Nunca repite la misma palabra en una lección.
 */
export function buildLesson(opts: BuildOptions): Item[] {
  const rnd = opts.random ?? Math.random;
  const size = opts.size ?? LESSON_SIZE;
  const recent = opts.recentIds ?? new Set<string>();
  const isFinal = opts.level >= opts.levels;
  const [lo, bandHi] = levelBand(opts.unitItems, opts.level, opts.levels);
  // Si ya domina las habilidades de la unidad (≥ 70), el margen del nivel sube un punto:
  // así no se queda en preguntas que le resultan demasiado fáciles.
  // Se usa la habilidad principal de la unidad (la más frecuente), no las auxiliares como «dictado».
  const counts = new Map<string, number>();
  for (const it of opts.unitItems) for (const s of it.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
  const mainSkill = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const unitMastery = mainSkill ? (opts.mastery[mainSkill] ?? 0) : 0;
  const maxDiff = Math.max(...opts.unitItems.map((i) => i.dificultad));
  const hi = unitMastery >= 70 ? Math.min(maxDiff, bandHi + 1) : bandHi;

  const chosen: Item[] = [];
  const usedWords = new Set<string>();
  const usedIds = new Set<string>();
  const take = (it: Item) => {
    const w = (it.palabra ?? it.frase ?? it.id).toLowerCase();
    if (usedIds.has(it.id) || usedWords.has(w)) return false;
    usedIds.add(it.id);
    usedWords.add(w);
    chosen.push(it);
    return true;
  };

  const nDue = Math.min(opts.dueItems.length, Math.round(size * 0.2));
  const nReview = Math.min(opts.reviewPool.length, Math.round(size * 0.15));
  const nMain = size - nDue - nReview;

  // 1) Ítems de la unidad, ordenados por cercanía a la dificultad objetivo.
  const inBand = opts.unitItems.filter((i) => isFinal || (i.dificultad >= lo && i.dificultad <= hi));
  const pool = inBand.length >= nMain ? inBand : opts.unitItems;
  const scored = shuffle(pool, rnd).map((it) => {
    const target = Math.min(hi, Math.max(lo, targetDifficulty(itemMastery(it, opts.mastery))));
    let score = Math.abs(it.dificultad - target);
    if (it.dificultad < target - 1) score += 1; // demasiado fácil
    if (recent.has(it.id)) score += 2; // ya visto hace poco
    return { it, score: score + rnd() * 0.5 };
  });
  scored.sort((a, b) => a.score - b.score);
  if (isFinal) {
    // En el nivel final queremos variedad de tipos de ejercicio.
    const byType = new Map<string, Item[]>();
    for (const { it } of scored) byType.set(it.tipo, [...(byType.get(it.tipo) ?? []), it]);
    const queues = [...byType.values()];
    while (chosen.length < nMain && queues.some((q) => q.length)) {
      for (const q of queues) {
        const it = q.shift();
        if (it && chosen.length < nMain) take(it);
      }
    }
  } else {
    for (const { it } of scored) {
      if (chosen.length >= nMain) break;
      take(it);
    }
  }

  // 2) Repasos pendientes y 3) repaso de unidades anteriores.
  for (const it of shuffle(opts.dueItems, rnd)) {
    if (chosen.length >= nMain + nDue) break;
    take(it);
  }
  for (const it of shuffle(opts.reviewPool, rnd)) {
    if (chosen.length >= size) break;
    take(it);
  }
  // Si faltan, completamos con la unidad.
  for (const { it } of scored) {
    if (chosen.length >= size) break;
    take(it);
  }

  // Orden: de más fácil a más difícil, con algo de mezcla.
  return chosen
    .map((it) => ({ it, k: it.dificultad + rnd() * 1.5 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.it);
}

/** Práctica libre: mezcla de todo lo desbloqueado, priorizando lo que más cuesta. */
export function buildPractice(pool: Item[], mastery: Record<string, number>, dueItems: Item[], size = 10, random = Math.random): Item[] {
  const due = shuffle(dueItems, random).slice(0, Math.round(size * 0.3));
  const scored = shuffle(pool, random)
    .map((it) => ({ it, k: itemMastery(it, mastery) + random() * 40 }))
    .sort((a, b) => a.k - b.k);
  const out: Item[] = [];
  const words = new Set<string>();
  for (const it of [...due, ...scored.map((s) => s.it)]) {
    const w = (it.palabra ?? it.id).toLowerCase();
    if (words.has(w)) continue;
    words.add(w);
    out.push(it);
    if (out.length >= size) break;
  }
  return out;
}
