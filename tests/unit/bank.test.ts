/**
 * Validación del banco de preguntas: se ejecuta en cada build (npm run build).
 * Recorre todos los ítems y comprueba con el módulo de fonología que las respuestas son coherentes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { UnitFileSchema, RulesFileSchema, type Item } from '../../src/core/content/schema';
import { checkWord, hasAccentMark, stripAccents, syllabify } from '../../src/core/phonology/phonology';
import { AMBIGUAS } from '../../content-src/words';

const DIR = fileURLToPath(new URL('../../public/content/', import.meta.url));
const files = readdirSync(DIR).filter((f) => /^[AB]\d+\.json$/.test(f));
const all: Item[] = [];
for (const f of files) {
  const parsed = UnitFileSchema.parse(JSON.parse(readFileSync(DIR + f, 'utf8')));
  all.push(...parsed.items);
}

/** Excepciones explícitas: tilde diacrítica e interrogativos/exclamativos (no siguen las reglas generales). */
const DIACRITICAS = new Set([
  'tú', 'él', 'mí', 'sí', 'sé', 'té', 'dé', 'más', 'aún',
  'qué', 'cuál', 'cuáles', 'quién', 'quiénes', 'cómo', 'cuándo', 'dónde', 'adónde', 'cuánto', 'cuánta', 'cuántos', 'cuántas', 'porqué',
]);
/** Formas que la norma de 2010 escribe SIN tilde: nunca pueden ser la respuesta correcta con tilde. */
const PROHIBIDAS = ['sólo', 'éste', 'ésta', 'éstos', 'éstas', 'ése', 'ésa', 'ésos', 'ésas', 'aquél', 'aquélla', 'aquéllos', 'aquéllas', 'guión', 'truhán', 'fué', 'dió', 'vió', 'fuí', 'pié'];

const isAccentItem = (it: Item) => it.id.startsWith('A');

describe('banco de preguntas', () => {
  it('hay contenido y los ids son únicos', () => {
    expect(all.length).toBeGreaterThan(500);
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
  });

  it('cada id corresponde a su archivo de unidad', () => {
    for (const f of files) {
      const unit = f.replace('.json', '');
      const parsed = UnitFileSchema.parse(JSON.parse(readFileSync(DIR + f, 'utf8')));
      expect(parsed.unidad).toBe(unit);
      for (const it of parsed.items) expect(it.id.startsWith(unit + '-')).toBe(true);
    }
  });

  it('todos los regla_id existen en reglas.json', () => {
    const reglas = RulesFileSchema.parse(JSON.parse(readFileSync(DIR + 'reglas.json', 'utf8')));
    const ids = new Set(reglas.reglas.map((r) => r.id));
    const missing = [...new Set(all.map((i) => i.regla_id))].filter((r) => !ids.has(r));
    expect(missing).toEqual([]);
  });

  it('la palabra de cada ítem de acentuación cumple las reglas (salvo diacríticas)', () => {
    const errors: string[] = [];
    for (const it of all.filter(isAccentItem)) {
      if (!it.palabra) continue;
      const w = it.palabra;
      if (DIACRITICAS.has(w.toLowerCase())) continue;
      const res = checkWord(w, syllabify(w).length > 1 ? it.clase : undefined);
      if (!res.ok) errors.push(`${it.id} «${w}»: ${res.reason}`);
    }
    expect(errors).toEqual([]);
  });

  it('ninguna respuesta correcta usa formas eliminadas por la RAE en 2010', () => {
    const bad = all.filter((it) => {
      const answers = [it.palabra, typeof it.respuesta === 'string' ? it.respuesta : undefined, it.correccion];
      return answers.some((a) => a && PROHIBIDAS.some((p) => new RegExp(`(^|[^\\p{L}])${p}($|[^\\p{L}])`, 'iu').test(a)));
    });
    expect(bad.map((b) => b.id)).toEqual([]);
  });

  it('separar: los cortes coinciden con la separación silábica', () => {
    for (const it of all.filter((i) => i.tipo === 'separar')) {
      const syl = syllabify(it.palabra!);
      let pos = 0;
      const exp = syl.slice(0, -1).map((s) => (pos += [...s].length));
      expect(it.respuesta, it.id).toEqual(exp);
    }
  });

  it('sílaba tónica: opciones = sílabas y respuesta = sílaba con tilde o de la clase indicada', () => {
    for (const it of all.filter((i) => i.tipo === 'silaba_tonica')) {
      const syl = syllabify(it.palabra!);
      expect(it.opciones, it.id).toEqual(syl);
      const acc = syl.findIndex((s) => hasAccentMark(s));
      const fromEnd = { aguda: 0, llana: 1, esdrujula: 2, sobresdrujula: 3 }[it.clase!];
      expect(it.respuesta, it.id).toBe(acc >= 0 ? acc : syl.length - 1 - fromEnd);
    }
  });

  it('poner la tilde: la posición coincide con la tilde de la palabra', () => {
    for (const it of all.filter((i) => i.tipo === 'poner_tilde')) {
      const idx = [...it.palabra!].findIndex((c) => hasAccentMark(c));
      expect(it.respuesta, it.id).toBe(idx);
      expect(AMBIGUAS.has(it.palabra!), `${it.id} usa una palabra ambigua`).toBe(false);
    }
  });

  it('elegir: una sola opción correcta y las demás solo difieren en tildes', () => {
    for (const it of all.filter((i) => i.tipo === 'elegir' && i.id.startsWith('A'))) {
      expect(it.opciones!.filter((o) => o === it.respuesta).length, it.id).toBe(1);
      for (const o of it.opciones!) expect(stripAccents(o), it.id).toBe(stripAccents(it.respuesta as string));
      expect(AMBIGUAS.has(it.respuesta as string), `${it.id} usa una palabra ambigua`).toBe(false);
    }
  });

  it('clasificar: la respuesta coincide con la clase calculada', () => {
    const label = { aguda: 'aguda', llana: 'llana', esdrujula: 'esdrújula', sobresdrujula: 'sobresdrújula' };
    for (const it of all.filter((i) => i.tipo === 'clasificar')) {
      expect(it.respuesta, it.id).toBe(label[it.clase!]);
    }
  });

  it('diptongo o hiato: coherente con la separación en sílabas', () => {
    for (const it of all.filter((i) => i.tipo === 'diptongo_hiato')) {
      const m = /«([^»]+)», las vocales «([^»]+)»/.exec(it.enunciado)!;
      const [, word, seq] = m;
      const syl = syllabify(word!);
      const same = syl.some((s) => s.toLowerCase().includes(seq!.toLowerCase()));
      const expected = same ? (seq!.replace(/h/gi, '').length === 3 ? 'triptongo' : 'diptongo') : 'hiato';
      expect(it.respuesta, it.id).toBe(expected);
    }
  });

  it('reparto de dificultades: cada unidad tiene ítems de varios niveles', () => {
    const byUnit = new Map<string, Set<number>>();
    for (const it of all) {
      const u = it.id.split('-')[0]!;
      if (!byUnit.has(u)) byUnit.set(u, new Set());
      byUnit.get(u)!.add(it.dificultad);
    }
    for (const [u, set] of byUnit) expect(set.size, u).toBeGreaterThanOrEqual(2);
  });
});
