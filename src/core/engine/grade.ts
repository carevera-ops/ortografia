import type { Item } from '../content/schema';
import { stripAccents, syllabify } from '../phonology/phonology';

export type AnswerValue = string | number | number[];

/** ¿Es correcta la respuesta? */
export function grade(item: Item, value: AnswerValue): boolean {
  const r = item.respuesta;
  if (Array.isArray(r)) {
    if (!Array.isArray(value)) return false;
    const a = [...value].sort((x, y) => x - y);
    const b = [...r].sort((x, y) => x - y);
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  if (item.tipo === 'dictado') return typeof value === 'string' && normalizeDictation(value) === normalizeDictation(String(r));
  return value === r;
}

/** Para el dictado: se ignoran espacios sobrantes y la mayúscula inicial, pero NO las tildes. */
export function normalizeDictation(s: string): string {
  return s.trim().replace(/\s+/g, ' ').replace(/[.!?¡¿,;:]+$/g, '').toLowerCase();
}

/** Texto de la respuesta correcta, para mostrarlo en el feedback. */
export function correctAnswerText(item: Item): string {
  switch (item.tipo) {
    case 'poner_tilde':
      return item.palabra!;
    case 'silaba_tonica': {
      const syl = item.opciones ?? syllabify(item.palabra!);
      return syl.map((s, i) => (i === item.respuesta ? s.toUpperCase() : s)).join('-');
    }
    case 'separar':
      return syllabify(item.palabra!).join('-');
    case 'clasificar':
      return `${item.palabra} es ${item.respuesta}`;
    case 'detectar_error':
      return item.correccion!;
    case 'dictado':
      return String(item.respuesta);
    default:
      return String(item.respuesta);
  }
}

/** Texto legible de lo que contestó el niño (para el historial de errores). */
export function answerText(item: Item, value: AnswerValue): string {
  switch (item.tipo) {
    case 'poner_tilde': {
      if (value === -1) return `${stripAccents(item.palabra!)} (sin tilde)`;
      const chars = [...stripAccents(item.palabra!)];
      const map: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' };
      const i = value as number;
      chars[i] = map[chars[i]!] ?? chars[i]!;
      return chars.join('');
    }
    case 'silaba_tonica':
      return item.opciones?.[value as number] ?? '';
    case 'separar': {
      const cuts = new Set(value as number[]);
      return [...item.palabra!].map((c, i) => (cuts.has(i) ? `-${c}` : c)).join('');
    }
    case 'detectar_error':
      return item.opciones?.[value as number] ?? '';
    default:
      return String(value);
  }
}
