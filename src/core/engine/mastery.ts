/**
 * Dominio por habilidad (0–100): media móvil ponderada por la dificultad.
 * - Un acierto difícil sube más que uno fácil.
 * - Un fallo fácil baja más que uno difícil.
 */
export function updateMastery(current: number, correct: boolean, difficulty: number): number {
  const d = Math.max(1, Math.min(5, difficulty));
  let next: number;
  if (correct) next = current + (100 - current) * (0.06 + 0.035 * d);
  else next = current - current * (0.06 + 0.035 * (6 - d));
  return Math.round(Math.max(0, Math.min(100, next)) * 10) / 10;
}

/** Dificultad objetivo (1–5) para un dominio dado: un poco por encima del nivel actual. */
export function targetDifficulty(mastery: number): number {
  return Math.max(1, Math.min(5, 1 + mastery / 25 + 0.5));
}
