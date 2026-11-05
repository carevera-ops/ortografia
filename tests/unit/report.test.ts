import { describe, expect, it } from 'vitest';
import { buildReport, decodeReport, encodeReport, newChildId, reportUrl, summarize, REPORT_DAYS } from '../../src/core/report/report';
import { addDays } from '../../src/core/time/dates';
import type { DailyStat } from '../../src/db/types';

const today = '2026-05-30';
const days: DailyStat[] = Array.from({ length: 60 }, (_, i) => ({
  date: addDays(today, -i), activeSec: 600 + i * 30, lessons: 2, xp: 90, questions: 30, correct: 26, freezeUsed: false,
}));

const input = {
  childId: 'ABC123XYZ0',
  alias: 'Pablo',
  today,
  streak: { current: 12, best: 20, freezes: 1 },
  days,
  skills: [
    { skill: 'agudas', mastery: 70, attempts: 120, correct: 100, updatedAt: '' },
    { skill: 'hiatos', mastery: 40, attempts: 50, correct: 30, updatedAt: '' },
  ],
  hardWords: ['jabalí', 'país', 'exámenes'],
  achievements: [{ id: 'racha-7', unlockedAt: '' }],
  unitsMastered: 5,
};

describe('informe de seguimiento', () => {
  it('ida y vuelta por el código comprimido', async () => {
    const r = buildReport(input);
    expect(r.d).toHaveLength(REPORT_DAYS);
    expect(r.d.at(-1)![0]).toBe(10); // hoy: 600 s
    const code = await encodeReport(r);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await decodeReport(code)).toEqual(r);
  });

  it('el enlace es corto para un QR y lleva los datos tras «#»', async () => {
    const code = await encodeReport(buildReport(input));
    const url = reportUrl('https://carevera-ops.github.io', '/ortografia/', code);
    expect(url.length).toBeLessThan(900);
    expect(url).toContain('/ortografia/#/informe/');
  });

  it('el alias es opcional', () => {
    expect(buildReport({ ...input, alias: null }).n).toBeUndefined();
  });

  it('rechaza códigos estropeados', async () => {
    const code = await encodeReport(buildReport(input));
    await expect(decodeReport(code.slice(0, 20))).rejects.toThrow(/no es válido/);
    await expect(decodeReport('hola')).rejects.toThrow(/no es válido/);
  });

  it('resumen semanal', () => {
    const s = summarize(buildReport(input));
    expect(s.weekDays).toBe(7);
    expect(s.weekLessons).toBe(14);
    expect(s.weekPct).toBe(87);
  });

  it('id aleatorio del niño', () => {
    const a = newChildId();
    expect(a).toMatch(/^[A-Z0-9]{8,10}$/);
    expect(newChildId()).not.toBe(a);
  });
});
