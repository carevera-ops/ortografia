import { describe, expect, it } from 'vitest';
import { answerText, correctAnswerText, grade, normalizeDictation } from '../../src/core/engine/grade';
import type { Item } from '../../src/core/content/schema';

const base = { id: 'A1-0001', enunciado: 'x x x', dificultad: 1, skills: ['s'], explicacion: 'xxxxx', regla_id: 'r' };

describe('corrección', () => {
  it('separar: compara los cortes sin importar el orden', () => {
    const it: Item = { ...base, tipo: 'separar', palabra: 'mariposa', respuesta: [2, 4, 6] };
    expect(grade(it, [6, 2, 4])).toBe(true);
    expect(grade(it, [2, 4])).toBe(false);
    expect(answerText(it, [2, 5])).toBe('ma-rip-osa');
    expect(correctAnswerText(it)).toBe('ma-ri-po-sa');
  });
  it('poner la tilde', () => {
    const it: Item = { ...base, tipo: 'poner_tilde', palabra: 'camión', respuesta: 4 };
    expect(grade(it, 4)).toBe(true);
    expect(grade(it, -1)).toBe(false);
    expect(answerText(it, 3)).toBe('camíon');
    expect(answerText(it, -1)).toBe('camion (sin tilde)');
  });
  it('sílaba tónica', () => {
    const it: Item = { ...base, tipo: 'silaba_tonica', palabra: 'verano', opciones: ['ve', 'ra', 'no'], respuesta: 1 };
    expect(grade(it, 1)).toBe(true);
    expect(correctAnswerText(it)).toBe('ve-RA-no');
  });
  it('dictado: respeta tildes, ignora mayúscula inicial y punto final', () => {
    expect(normalizeDictation(' El camión  llegó. ')).toBe('el camión llegó');
    const it: Item = { ...base, tipo: 'dictado', palabra: 'camión', respuesta: 'camión' };
    expect(grade(it, 'Camión')).toBe(true);
    expect(grade(it, 'camion')).toBe(false);
  });
});
