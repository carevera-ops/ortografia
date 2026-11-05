/** XP por pregunta acertada: 5 × dificultad, +50 % a partir de 5 aciertos seguidos. */
export function xpFor(difficulty: number, combo: number): number {
  const base = 5 * Math.max(1, Math.min(5, difficulty));
  return Math.round(combo >= 5 ? base * 1.5 : base);
}

/** XP extra por terminar una lección (más si es perfecta). */
export function lessonBonus(pct: number): number {
  if (pct >= 100) return 20;
  if (pct >= 80) return 10;
  return 5;
}
