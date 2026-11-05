/**
 * Módulo de fonología (ortográfica) del español.
 *
 * - Separación en sílabas con diptongos, triptongos, hiatos y grupos consonánticos inseparables.
 * - Localización de la sílaba tónica.
 * - Aplicación de las reglas generales de acentuación (norma RAE, Ortografía 2010).
 *
 * Trabaja sobre la escritura (no sobre la pronunciación): por eso la "h" intercalada no impide
 * el diptongo ortográfico, "qu" y "gu" + e/i cuentan como una sola consonante, y la "y" final
 * tras vocal cuenta como vocal para silabear (rey, muy) pero como consonante para la tilde.
 */

export type StressClass = 'aguda' | 'llana' | 'esdrujula' | 'sobresdrujula';

const ACCENTED: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const STRONG = new Set(['a', 'e', 'o', 'á', 'é', 'ó', 'í', 'ú']); // í y ú con tilde se comportan como fuertes (hiato)
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);

/** Grupos de consonante + l/r que no se separan (en España "tl" sí se separa: at-le-ta). */
const INSEPARABLE = new Set(['pr', 'pl', 'br', 'bl', 'fr', 'fl', 'tr', 'dr', 'cr', 'cl', 'gr', 'gl', 'kr', 'kl']);

export function isVowel(ch: string): boolean {
  return VOWELS.has(ch.toLowerCase());
}

export function hasAccentMark(word: string): boolean {
  return /[áéíóú]/i.test(word);
}

/** Quita las tildes (no la diéresis ni la ñ). */
export function stripAccents(word: string): string {
  return word.replace(/[áéíóúÁÉÍÓÚ]/g, (c) => {
    const lower = c.toLowerCase();
    const base = ACCENTED[lower] ?? lower;
    return c === lower ? base : base.toUpperCase();
  });
}

/** Unidad gráfica: una vocal o una consonante (que puede ser un dígrafo: ch, ll, rr, qu, gu). */
interface Unit {
  text: string;
  vowel: boolean;
}

function tokenize(word: string): Unit[] {
  const w = word.toLowerCase();
  const units: Unit[] = [];
  let i = 0;
  while (i < w.length) {
    const c = w[i]!;
    const next = w[i + 1] ?? '';
    const pair = c + next;
    if (pair === 'ch' || pair === 'll' || pair === 'rr') {
      units.push({ text: word.slice(i, i + 2), vowel: false });
      i += 2;
      continue;
    }
    // "qu" siempre, y "gu" delante de e/i: la u no suena, forma parte de la consonante.
    if (c === 'q' && next === 'u') {
      units.push({ text: word.slice(i, i + 2), vowel: false });
      i += 2;
      continue;
    }
    if (c === 'g' && next === 'u' && /[eéií]/.test(w[i + 2] ?? '')) {
      units.push({ text: word.slice(i, i + 2), vowel: false });
      i += 2;
      continue;
    }
    if (c === 'y') {
      const prevVowel = units.length > 0 && units[units.length - 1]!.vowel;
      const nextVowel = isVowel(next);
      // "y" es vocal si no va seguida de vocal y va tras vocal (rey, muy) o está sola (y).
      const asVowel = !nextVowel && (prevVowel || w.length === 1);
      units.push({ text: word[i]!, vowel: asVowel });
      i += 1;
      continue;
    }
    units.push({ text: word[i]!, vowel: isVowel(c) });
    i += 1;
  }
  return units;
}

function isStrongUnit(u: Unit): boolean {
  return STRONG.has(u.text.toLowerCase());
}

/**
 * ¿Hay frontera silábica (hiato) entre dos vocales seguidas?
 * - Dos fuertes (a, e, o): hiato (le-er, ca-os).
 * - Débil con tilde + fuerte, o fuerte + débil con tilde: hiato (pa-ís, rí-o).
 * - Dos iguales débiles (ii, uu): hiato (chi-ita, du-unviro).
 * - En otro caso: diptongo.
 */
function isHiatus(a: Unit, b: Unit): boolean {
  const x = a.text.toLowerCase();
  const y = b.text.toLowerCase();
  if (isStrongUnit(a) && isStrongUnit(b)) return true;
  if ((x === 'i' && y === 'i') || (x === 'u' && y === 'u')) return true;
  return false;
}

/** Separa una palabra en sílabas. Conserva mayúsculas y tildes. */
export function syllabify(word: string): string[] {
  const units = tokenize(word);
  if (units.length === 0) return [];

  // 1) Agrupar vocales seguidas en núcleos, cortando en los hiatos.
  type Group = { vowel: boolean; units: Unit[] };
  const groups: Group[] = [];
  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui]!;
    const last = groups[groups.length - 1];
    // La "h" entre vocales no impide el diptongo ortográfico (prohi-bir, truhan, ahu-mar).
    const nextU = units[ui + 1];
    if (
      u.text.toLowerCase() === 'h' &&
      last?.vowel &&
      nextU?.vowel &&
      !isHiatus(last.units[last.units.length - 1]!, nextU)
    ) {
      last.units.push(u, nextU);
      ui++;
      continue;
    }
    if (u.vowel && last?.vowel && !isHiatus(last.units[last.units.length - 1]!, u)) {
      last.units.push(u);
    } else if (!u.vowel && last && !last.vowel) {
      last.units.push(u);
    } else {
      groups.push({ vowel: u.vowel, units: [u] });
    }
  }

  // Sin vocales (siglas, interjecciones como "pst"): una sola "sílaba".
  if (!groups.some((g) => g.vowel)) return [word];

  // 2) Repartir las consonantes entre núcleos.
  const syllables: string[] = [];
  let current = '';
  const text = (us: Unit[]) => us.map((u) => u.text).join('');
  const nuclei = groups.filter((g) => g.vowel).length;
  let seenNuclei = 0;

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    if (g.vowel) {
      // Dos grupos vocálicos seguidos = hiato: cerramos la sílaba anterior.
      if (current && groups[gi - 1]?.vowel) {
        syllables.push(current);
        current = '';
      }
      current += text(g.units);
      seenNuclei++;
      continue;
    }
    // Grupo consonántico
    if (seenNuclei === 0) {
      current += text(g.units); // consonantes iniciales
      continue;
    }
    if (seenNuclei === nuclei) {
      current += text(g.units); // consonantes finales
      continue;
    }
    const cs = g.units;
    const lower = (u: Unit) => u.text.toLowerCase();
    let keep: number; // cuántas consonantes se quedan en la sílaba anterior
    if (cs.length === 1) keep = 0;
    else if (cs.length === 2) keep = INSEPARABLE.has(lower(cs[0]!) + lower(cs[1]!)) ? 0 : 1;
    else {
      const lastTwo = lower(cs[cs.length - 2]!) + lower(cs[cs.length - 1]!);
      keep = INSEPARABLE.has(lastTwo) ? cs.length - 2 : cs.length - 1;
    }
    current += text(cs.slice(0, keep));
    syllables.push(current);
    current = text(cs.slice(keep));
  }
  if (current) syllables.push(current);
  return syllables;
}

/** Índice (0 = primera) de la sílaba que lleva tilde, o -1 si no hay tilde. */
function accentedSyllableIndex(syllables: string[]): number {
  return syllables.findIndex((s) => hasAccentMark(s));
}

/** Última letra relevante, en minúsculas y sin tilde. */
function lastLetter(word: string): string {
  return stripAccents(word.toLowerCase()).slice(-1);
}

/** ¿Termina en vocal, en -n o en -s precedidas de vocal? (La -y final cuenta como consonante.) */
export function endsInVowelNS(word: string): boolean {
  const w = stripAccents(word.toLowerCase());
  const last = w.slice(-1);
  if ('aeiouü'.includes(last)) return true;
  if (last === 'n' || last === 's') return 'aeiouü'.includes(w.slice(-2, -1));
  return false;
}

/**
 * Sílaba tónica "por defecto" de una palabra SIN tilde:
 * llana si acaba en vocal, -n o -s; aguda en otro caso.
 * (Las agudas sin tilde en -ns/-ts como "robots" no siguen este patrón: por eso el banco
 * indica la clase de forma explícita y aquí solo se usa como comprobación auxiliar.)
 */
export function defaultStressIndex(word: string): number {
  const syl = syllabify(word);
  if (syl.length <= 1) return 0;
  const last = lastLetter(word);
  return 'aeiouns'.includes(last) ? syl.length - 2 : syl.length - 1;
}

/** Sílaba tónica: la de la tilde si la hay; si no, la regla por defecto. */
export function stressedSyllableIndex(word: string): number {
  const syl = syllabify(word);
  const acc = accentedSyllableIndex(syl);
  return acc >= 0 ? acc : defaultStressIndex(word);
}

/** Clasificación según la posición de la sílaba tónica (contando desde el final). */
export function classifyByIndex(syllableCount: number, stressIndex: number): StressClass {
  const fromEnd = syllableCount - 1 - stressIndex;
  if (fromEnd === 0) return 'aguda';
  if (fromEnd === 1) return 'llana';
  if (fromEnd === 2) return 'esdrujula';
  return 'sobresdrujula';
}

export function classify(word: string): StressClass {
  const syl = syllabify(word);
  return classifyByIndex(syl.length, stressedSyllableIndex(word));
}

/** Posición de la vocal tónica dentro de la sílaba (donde iría la tilde). */
export function stressedVowelOffset(syllable: string): number {
  const units = tokenize(syllable);
  // Recorremos por unidades, guardando la posición en caracteres.
  const positions: { pos: number; u: Unit }[] = [];
  let pos = 0;
  for (const u of units) {
    positions.push({ pos, u });
    pos += u.text.length;
  }
  const vowels = positions.filter((p) => p.u.vowel);
  const accented = vowels.find((p) => hasAccentMark(p.u.text));
  if (accented) return accented.pos;
  // La tilde va en la vocal fuerte; si son dos débiles (ui, iu), en la segunda.
  const strong = vowels.find((p) => 'aeo'.includes(p.u.text.toLowerCase()));
  if (strong) return strong.pos;
  const weak = vowels.filter((p) => p.u.text.toLowerCase() !== 'y');
  return (weak[weak.length - 1] ?? vowels[0])?.pos ?? 0;
}

/**
 * ¿La vocal tónica es una i/u en hiato con una vocal fuerte (país, búho, reír)?
 * Se mira a ambos lados, también a través de una h (bú-ho, pro-hí-be).
 */
export function isAccentualHiatus(syllables: string[], stressIndex: number): boolean {
  const syl = syllables[stressIndex];
  if (!syl) return false;
  const off = stressedVowelOffset(syl);
  const v = stripAccents(syl[off]!.toLowerCase());
  if (v !== 'i' && v !== 'u') return false;
  // Vocal anterior: dentro de la sílaba no puede haberla (sería diptongo); miramos la sílaba previa.
  const before = syl.slice(0, off);
  const after = syl.slice(off + 1);
  const prev = syllables[stressIndex - 1] ?? '';
  const next = syllables[stressIndex + 1] ?? '';
  const strongRe = /[aeoáéó]/i;
  const prevEndsStrong = before.replace(/h/gi, '') === '' && strongRe.test(prev.slice(-1));
  const nextStartsStrong = after === '' && strongRe.test(next.replace(/^h/i, '').slice(0, 1));
  return prevEndsStrong || nextStartsStrong;
}

/**
 * Reglas generales de acentuación: ¿debe escribirse la tilde?
 * Recibe la palabra con la vocal tónica MARCADA con tilde (aunque luego no la lleve):
 * así se separa bien en sílabas cuando hay hiato (pa-ís, re-ír).
 * No contempla la tilde diacrítica (tú, él, qué…), que se trata aparte.
 */
export function needsAccent(marked: string): boolean {
  const syl = syllabify(marked);
  const idx = accentedSyllableIndex(syl);
  if (idx < 0) throw new Error(`needsAccent: falta marcar la vocal tónica en «${marked}»`);
  if (syl.length <= 1) return false; // monosílabos: sin tilde (salvo diacrítica)
  if (isAccentualHiatus(syl, idx)) return true;
  const cls = classifyByIndex(syl.length, idx);
  switch (cls) {
    case 'aguda':
      return endsInVowelNS(marked);
    case 'llana':
      return !endsInVowelNS(marked);
    default:
      return true;
  }
}

/** Escribe la tilde en la vocal tónica de la sílaba indicada. */
export function placeAccent(plainWord: string, stressIndex: number, syllables = syllabify(plainWord)): string {
  const map: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' };
  let out = '';
  syllables.forEach((s, i) => {
    if (i !== stressIndex) {
      out += s;
      return;
    }
    const off = stressedVowelOffset(s);
    const ch = s[off]!;
    out += s.slice(0, off) + (map[ch] ?? ch) + s.slice(off + 1);
  });
  return out;
}

/** Comprueba que una palabra bien escrita es coherente con la clase indicada. */
export function checkWord(word: string, expected?: StressClass): { ok: boolean; reason?: string } {
  const syl = syllabify(word);
  const acc = accentedSyllableIndex(syl);
  if (syl.length > 1 && acc < 0 && !expected) {
    return { ok: false, reason: 'palabra sin tilde: falta indicar la clase (aguda/llana/…)' };
  }
  let idx = acc;
  if (idx < 0) {
    if (!expected) idx = 0;
    else {
      const fromEnd = { aguda: 0, llana: 1, esdrujula: 2, sobresdrujula: 3 }[expected];
      idx = syl.length - 1 - fromEnd;
      if (idx < 0) return { ok: false, reason: `no tiene sílabas suficientes para ser ${expected}` };
    }
  }
  const cls = classifyByIndex(syl.length, idx);
  if (expected && cls !== expected) return { ok: false, reason: `es ${cls}, no ${expected}` };
  if (syl.length === 1) {
    return acc >= 0 ? { ok: false, reason: 'monosílabo con tilde (¿diacrítica?)' } : { ok: true };
  }
  // ¿Coincide la presencia de tilde con lo que piden las reglas?
  const has = acc >= 0;
  const marked = has ? word : placeAccent(word, idx, syl);
  const should = needsAccent(marked);
  if (should !== has) {
    return { ok: false, reason: should ? 'debería llevar tilde' : 'no debería llevar tilde' };
  }
  if (has) {
    // La tilde debe ir en la vocal que marcan las reglas dentro de su sílaba.
    const s = syl[acc]!;
    const expectedOff = stressedVowelOffset(stripAccents(s));
    const actualOff = [...s].findIndex((c) => hasAccentMark(c));
    if (expectedOff !== actualOff) return { ok: false, reason: 'la tilde está en la vocal equivocada' };
  }
  return { ok: true };
}

/** Explicación breve (para 12 años) de por qué lleva o no lleva tilde. */
export function explainAccent(word: string, stressIndex = stressedSyllableIndex(word)): string {
  const syl = syllabify(word);
  const sep = syl.join('-');
  if (syl.length === 1) return `«${word}» tiene una sola sílaba: los monosílabos no llevan tilde (salvo la diacrítica).`;
  const cls = classifyByIndex(syl.length, stressIndex);
  const has = hasAccentMark(word);
  const tonic = syl[stressIndex] ?? '';
  if (isAccentualHiatus(syl, stressIndex)) {
    const v = stripAccents(tonic[stressedVowelOffset(tonic)] ?? '').toLowerCase();
    return `${sep}: la «${v}» suena fuerte y forma hiato con la vocal de al lado, así que lleva tilde siempre, digan lo que digan las reglas generales.`;
  }
  const w = stripAccents(word.toLowerCase());
  const lastCh = w.slice(-1);
  const groupEnd = (lastCh === 'n' || lastCh === 's') && !'aeiouü'.includes(w.slice(-2, -1));
  switch (cls) {
    case 'aguda':
      if (lastCh === 'y') return `${sep}: es aguda y acaba en -y, que cuenta como consonante, así que no lleva tilde.`;
      if (groupEnd)
        return `${sep}: es aguda y acaba en -${w.slice(-2)}: la -${lastCh} va detrás de otra consonante, así que no lleva tilde.`;
      return has
        ? `${sep}: es aguda (suena fuerte «${tonic}») y acaba en ${describeEnding(word)}, así que lleva tilde.`
        : `${sep}: es aguda y acaba en ${describeEnding(word)}; las agudas solo llevan tilde si acaban en vocal, -n o -s.`;
    case 'llana':
      if (groupEnd)
        return `${sep}: es llana y acaba en -${w.slice(-2)}: la -${lastCh} va detrás de otra consonante, así que lleva tilde.`;
      if (lastCh === 'y') return `${sep}: es llana y acaba en -y, que cuenta como consonante, así que lleva tilde.`;
      return has
        ? `${sep}: es llana y acaba en ${describeEnding(word)}; las llanas llevan tilde cuando NO acaban en vocal, -n o -s.`
        : `${sep}: es llana y acaba en ${describeEnding(word)}, así que no lleva tilde.`;
    default:
      return `${sep}: es ${cls === 'esdrujula' ? 'esdrújula' : 'sobresdrújula'} (suena fuerte «${tonic}»), y estas llevan tilde siempre.`;
  }
}

function describeEnding(word: string): string {
  const w = stripAccents(word.toLowerCase());
  const last = w.slice(-1);
  if ('aeiou'.includes(last)) return 'vocal';
  if ((last === 'n' || last === 's') && !'aeiou'.includes(w.slice(-2, -1))) return `-${w.slice(-2)} (dos consonantes)`;
  return `-${last}`;
}

export const STRESS_LABEL: Record<StressClass, string> = {
  aguda: 'aguda',
  llana: 'llana',
  esdrujula: 'esdrújula',
  sobresdrujula: 'sobresdrújula',
};
