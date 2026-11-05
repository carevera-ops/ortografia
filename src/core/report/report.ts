import { z } from 'zod';
import type { Achievement, DailyStat, SkillMastery } from '../../db/types';
import { addDays, type LocalDate } from '../time/dates';

/**
 * Informe de seguimiento para otro dispositivo (sin servidor).
 *
 * El informe se comprime y va DENTRO del enlace, en la parte que hay detrás de «#»
 * (el fragmento), que el navegador nunca envía al servidor. Así, los datos viajan del
 * iPhone del niño al móvil de la madre o el padre sin pasar por ningún sitio.
 */
export const REPORT_DAYS = 28;

export const ReportSchema = z.object({
  v: z.literal(1),
  /** Identificador aleatorio del niño (para agrupar informes; no es un dato personal). */
  id: z.string().min(4).max(16),
  /** Alias opcional que se ha elegido mostrar. */
  n: z.string().max(30).optional(),
  /** Fecha local de generación. */
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Racha: actual, récord, protectores. */
  s: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  /** Totales: segundos, lecciones, XP, preguntas, aciertos. */
  t: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
  /** Últimos 28 días, del más antiguo al de hoy: [minutos, lecciones, preguntas, aciertos]. */
  d: z.array(z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()])).max(REPORT_DAYS),
  /** Habilidades: [clave, respuestas, aciertos]. */
  k: z.array(z.tuple([z.string(), z.number().int(), z.number().int()])).max(40),
  /** Palabras que más cuestan. */
  w: z.array(z.string()).max(8),
  /** Insignias conseguidas y unidades superadas. */
  b: z.number().int(),
  u: z.number().int(),
});
export type Report = z.infer<typeof ReportSchema>;

export interface ReportInput {
  childId: string;
  alias?: string | null;
  today: LocalDate;
  streak: { current: number; best: number; freezes: number };
  days: DailyStat[];
  skills: SkillMastery[];
  hardWords: string[];
  achievements: Achievement[];
  unitsMastered: number;
}

export function buildReport(i: ReportInput): Report {
  const byDate = new Map(i.days.map((d) => [d.date, d]));
  const d = Array.from({ length: REPORT_DAYS }, (_, k) => {
    const x = byDate.get(addDays(i.today, k - (REPORT_DAYS - 1)));
    return [Math.floor((x?.activeSec ?? 0) / 60), x?.lessons ?? 0, x?.questions ?? 0, x?.correct ?? 0] as [number, number, number, number];
  });
  const sum = (f: (x: DailyStat) => number) => i.days.reduce((a, x) => a + f(x), 0);
  return {
    v: 1,
    id: i.childId,
    ...(i.alias ? { n: i.alias.slice(0, 30) } : {}),
    at: i.today,
    s: [i.streak.current, i.streak.best, i.streak.freezes],
    t: [sum((x) => x.activeSec), sum((x) => x.lessons), sum((x) => x.xp), sum((x) => x.questions), sum((x) => x.correct)],
    d,
    k: i.skills
      .filter((s) => s.attempts > 0)
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 40)
      .map((s) => [s.skill, s.attempts, s.correct] as [string, number, number]),
    w: i.hardWords.slice(0, 8),
    b: i.achievements.length,
    u: i.unitsMastered,
  };
}

// ---- Codificación: JSON → deflate → base64url ----

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeReport(r: Report): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(r));
  return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function decodeReport(code: string): Promise<Report> {
  try {
    const raw = await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw'));
    return ReportSchema.parse(JSON.parse(new TextDecoder().decode(raw)));
  } catch {
    throw new Error('El código de seguimiento no es válido o está incompleto.');
  }
}

export function reportUrl(origin: string, base: string, code: string): string {
  return `${origin}${base}#/informe/${code}`;
}

export function newChildId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10).toUpperCase();
}

/** Resumen de un informe: últimos 7 días y aciertos globales. */
export function summarize(r: Report) {
  const week = r.d.slice(-7);
  const weekMin = week.reduce((a, x) => a + x[0], 0);
  const weekQ = week.reduce((a, x) => a + x[2], 0);
  const weekC = week.reduce((a, x) => a + x[3], 0);
  return {
    weekMin,
    weekDays: week.filter((x) => x[2] > 0).length,
    weekLessons: week.reduce((a, x) => a + x[1], 0),
    weekPct: weekQ ? Math.round((100 * weekC) / weekQ) : null,
    totalPct: r.t[3] ? Math.round((100 * r.t[4]) / r.t[3]) : null,
  };
}
