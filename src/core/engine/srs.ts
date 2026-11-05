import { addDays, type LocalDate } from '../time/dates';
import type { SrsCard } from '../../db/types';

/** Repetición espaciada tipo Leitner: 5 cajas con repasos a 1, 2, 4, 8 y 16 días. */
export const INTERVALS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = INTERVALS.length;

/**
 * Actualiza (o crea) la tarjeta de un ítem tras responderlo.
 * - Solo se crean tarjetas para lo que se falla.
 * - Un fallo devuelve la tarjeta a la caja 1.
 * - Un acierto la sube de caja; al superar la última, la tarjeta "se gradúa" (null = borrar).
 */
export function reviewCard(card: SrsCard | undefined, itemId: string, correct: boolean, today: LocalDate): SrsCard | null {
  if (!card) {
    if (correct) return null;
    return { itemId, box: 1, due: addDays(today, INTERVALS[0]), lapses: 1, lastSeen: today };
  }
  if (!correct) return { ...card, box: 1, due: addDays(today, INTERVALS[0]), lapses: card.lapses + 1, lastSeen: today };
  const box = card.box + 1;
  if (box > MAX_BOX) return null;
  return { ...card, box, due: addDays(today, INTERVALS[box - 1]!), lastSeen: today };
}

export function isDue(card: SrsCard, today: LocalDate): boolean {
  return card.due <= today;
}
