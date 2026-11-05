/**
 * Utilidades de fechas LOCALES (zona horaria del dispositivo).
 * Nunca usamos toISOString() para el "día", porque daría la fecha en UTC.
 */
export type LocalDate = string; // YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date = new Date()): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convierte YYYY-MM-DD en un Date a las 12:00 locales (evita líos con el cambio de hora). */
export function parseLocalDate(s: LocalDate): Date {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(s: LocalDate, n: number): LocalDate {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + n);
  return toLocalDate(d);
}

/** Días naturales entre dos fechas locales (b - a). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((parseLocalDate(b).getTime() - parseLocalDate(a).getTime()) / 86_400_000);
}
