/**
 * Generador del banco de preguntas de acentuación (unidades A1–A10).
 * Uso: npm run bank   (escribe public/content/<unidad>.json)
 *
 * Las respuestas se calculan con el módulo de fonología a partir de listas de palabras
 * revisadas a mano; el test tests/unit/bank.test.ts vuelve a comprobarlo todo en cada build.
 */
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  classifyByIndex,
  explainAccent,
  hasAccentMark,
  isAccentualHiatus,
  placeAccent,
  stripAccents,
  syllabify,
  type StressClass,
} from '../src/core/phonology/phonology.ts';
import * as W from './words.ts';

const OUT = fileURLToPath(new URL('../public/content/', import.meta.url));

type Cls = StressClass;
interface Word {
  word: string;
  cls: Cls | null; // null = monosílabo
  stress: number;
  syl: string[];
  tier: number;
}

interface Item {
  id: string;
  tipo: string;
  enunciado: string;
  palabra?: string;
  clase?: Cls;
  frase?: string;
  opciones?: string[];
  respuesta: string | number | number[];
  correccion?: string;
  dificultad: number;
  skills: string[];
  explicacion: string;
  regla_id: string;
}

const CLS_FROM_LETTER: Record<string, Cls> = { A: 'aguda', L: 'llana', E: 'esdrujula', S: 'sobresdrujula' };
const LABEL: Record<Cls, string> = { aguda: 'aguda', llana: 'llana', esdrujula: 'esdrújula', sobresdrujula: 'sobresdrújula' };
const FROM_END: Record<Cls, number> = { aguda: 0, llana: 1, esdrujula: 2, sobresdrujula: 3 };

/** Convierte "reloj:A" o "camión" en un objeto Word. */
function parse(entry: string, tier: number): Word {
  const [word, letter] = entry.split(':') as [string, string | undefined];
  const syl = syllabify(word);
  if (syl.length === 1) return { word, cls: null, stress: 0, syl, tier };
  const acc = syl.findIndex((s) => hasAccentMark(s));
  let stress: number;
  if (acc >= 0) stress = acc;
  else {
    if (!letter) throw new Error(`Falta la clase de «${word}»`);
    stress = syl.length - 1 - FROM_END[CLS_FROM_LETTER[letter]!];
  }
  return { word, cls: classifyByIndex(syl.length, stress), stress, syl, tier };
}

const fromTiers = (t: Record<number, string[]>) =>
  Object.entries(t).flatMap(([tier, list]) => list.map((e) => parse(e, Number(tier))));
const fromList = (list: string[], tier: number) => list.map((e) => parse(e, tier));

// Barajado determinista (para que el banco no cambie entre ejecuciones)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
function shuffle<T>(arr: T[], seed: number): T[] {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
function uniqueBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

const clamp = (n: number) => Math.max(1, Math.min(5, n));

// ---------- Plantillas de ejercicio ----------

/** Formas incorrectas verosímiles de una palabra (tilde quitada, puesta o movida). */
function misspellings(w: Word): string[] {
  const plain = stripAccents(w.word);
  const plainSyl = syllabify(plain);
  const out = new Set<string>();
  if (hasAccentMark(w.word)) out.add(plain);
  for (let i = 0; i < plainSyl.length; i++) {
    const v = placeAccent(plain, i, plainSyl);
    if (v !== w.word) out.add(v);
  }
  // Tilde en la otra vocal de un diptongo (camíon)
  const accIdx = [...w.word].findIndex((c) => hasAccentMark(c));
  if (accIdx >= 0) {
    const chars = [...plain];
    for (const d of [-1, 1]) {
      const j = accIdx + d;
      if (/[aeiou]/i.test(chars[j] ?? '')) {
        const alt = [...chars];
        alt[j] = placeAccent(alt[j]!, 0, [alt[j]!]);
        out.add(alt.join(''));
      }
    }
  }
  out.delete(w.word);
  return [...out];
}

function reason(w: Word): { text: string; regla: string } {
  const wl = stripAccents(w.word.toLowerCase());
  const last = wl.slice(-1);
  const prev = wl.slice(-2, -1);
  const consGroup = (last === 's' || last === 'n') && !'aeiou'.includes(prev);
  const syl = w.syl;
  const tonic = syl[w.stress] ?? '';
  const hiato = hasAccentMark(w.word) && /[íú]/i.test(tonic) && syl.length > 1 && isHiatoAcentual(w);
  if (w.cls === null) return { text: R.mono, regla: 'monosilabos' };
  if (hiato) return { text: R.hiato, regla: 'hiatos' };
  if (w.cls === 'esdrujula' || w.cls === 'sobresdrujula') return { text: R.esdr, regla: 'esdrujulas' };
  if (w.cls === 'aguda') {
    if (last === 'y') return { text: R.agudaY, regla: 'casos-especiales' };
    if (consGroup) return { text: R.agudaGrupo, regla: 'casos-especiales' };
    return hasAccentMark(w.word) ? { text: R.agudaSi, regla: 'agudas' } : { text: R.agudaNo, regla: 'agudas' };
  }
  if (consGroup && last === 's') return { text: R.llanaGrupo, regla: 'casos-especiales' };
  return hasAccentMark(w.word) ? { text: R.llanaSi, regla: 'llanas' } : { text: R.llanaNo, regla: 'llanas' };
}

function isHiatoAcentual(w: Word): boolean {
  return isAccentualHiatus(w.syl, w.stress);
}

const R = {
  agudaSi: 'Es aguda y acaba en vocal, -n o -s → lleva tilde',
  agudaNo: 'Es aguda y no acaba en vocal, -n ni -s → no lleva tilde',
  llanaSi: 'Es llana y no acaba en vocal, -n ni -s → lleva tilde',
  llanaNo: 'Es llana y acaba en vocal, -n o -s → no lleva tilde',
  esdr: 'Es esdrújula o sobresdrújula → siempre lleva tilde',
  hiato: 'La i o la u suena fuerte y forma hiato → lleva tilde',
  mono: 'Es un monosílabo → no lleva tilde',
  agudaY: 'Es aguda y acaba en -y, que cuenta como consonante → no lleva tilde',
  agudaGrupo: 'Es aguda y acaba en -s o -n tras otra consonante → no lleva tilde',
  llanaGrupo: 'Es llana y acaba en -s tras otra consonante → lleva tilde',
};
const ALL_REASONS = Object.values(R);

/** Explicación de la separación silábica, adaptada a 12 años. */
function explainSyllables(w: Word): string {
  const s = w.syl.join('-');
  const tips: string[] = [];
  const lw = w.word.toLowerCase();
  if (/(ch|ll|rr)/.test(lw)) tips.push('ch, ll y rr nunca se separan');
  if (/([pbfgcdtk])[lr]/.test(lw) && w.syl.some((x) => /^[pbfgcdtk][lr]/i.test(x)))
    tips.push('los grupos como pr, bl, tr o cl van juntos en la misma sílaba');
  if (w.syl.some((x) => /[aeiouáéíóú]{2}/i.test(x.replace(/^(qu|gu)/i, ''))))
    tips.push('las vocales que forman diptongo van en la misma sílaba');
  if (w.syl.some((x, i) => i > 0 && /^h?[aeiouáéíóú]/i.test(x) && /[aeiouáéíóúy]$/i.test(w.syl[i - 1]!)))
    tips.push('las vocales en hiato van en sílabas distintas');
  // Fronteras entre sílabas: ¿consonante sola que pasa a la siguiente, o dos consonantes que se reparten?
  const V = /[aeiouáéíóúü]/i;
  let single = false;
  let pair = false;
  for (let i = 1; i < w.syl.length; i++) {
    const prev = w.syl[i - 1]!;
    const cur = w.syl[i]!;
    const prevEndsCons = !V.test(prev.slice(-1)) && !/y$/i.test(prev);
    const curStartsCons = !V.test(cur.slice(0, 1));
    if (prevEndsCons && curStartsCons) pair = true;
    else if (!prevEndsCons && curStartsCons && !/^(ch|ll|rr|[pbfgcdtk][lr])/i.test(cur)) single = true;
  }
  if (pair) tips.push('cuando hay dos consonantes seguidas, una se queda en la sílaba de delante y la otra pasa a la siguiente');
  if (single) tips.push('una consonante entre dos vocales se une a la vocal de detrás');
  if (tips.length === 0) tips.push('cada sílaba tiene al menos una vocal');
  return `Se separa así: ${s} (${w.syl.length} sílabas). Recuerda: ${tips.join('; ')}.`.replace(
    '(1 sílabas)',
    '(1 sílaba)',
  );
}

function cuts(w: Word): number[] {
  const res: number[] = [];
  let pos = 0;
  for (const s of w.syl.slice(0, -1)) {
    pos += [...s].length;
    res.push(pos);
  }
  return res;
}

// ---------- Fábricas de ítems ----------

type Make = (w: Word) => Omit<Item, 'id'> | null;

const mkSeparar: Make = (w) => ({
  tipo: 'separar',
  enunciado: 'Toca entre las letras para separar la palabra en sílabas',
  palabra: w.word,
  ...(w.cls ? { clase: w.cls } : {}),
  respuesta: cuts(w),
  dificultad: clamp(w.tier + (w.syl.length >= 4 ? 1 : 0)),
  skills: ['silabas'],
  explicacion: explainSyllables(w),
  regla_id: 'silabas',
});

const mkTonica: Make = (w) =>
  w.cls === null
    ? null
    : {
        tipo: 'silaba_tonica',
        enunciado: '¿Cuál es la sílaba que suena más fuerte?',
        palabra: w.word,
        clase: w.cls,
        opciones: w.syl,
        respuesta: w.stress,
        dificultad: clamp(w.tier + (hasAccentMark(w.word) ? 0 : 1)),
        skills: ['tonica'],
        explicacion: `En «${w.word}» suena más fuerte «${w.syl[w.stress]}»: ${w.syl
          .map((s, i) => (i === w.stress ? s.toUpperCase() : s))
          .join('-')}.${hasAccentMark(w.word) ? ' ¡La tilde te da la pista!' : ''}`,
        regla_id: 'silaba-tonica',
      };

const mkClasificar =
  (withSobres: boolean): Make =>
  (w) => {
    if (w.cls === null) return null;
    const opts: Cls[] = ['aguda', 'llana', 'esdrujula'];
    if (withSobres) opts.push('sobresdrujula');
    const posName = ['la última', 'la penúltima', 'la antepenúltima', 'una anterior a la antepenúltima'][FROM_END[w.cls]];
    return {
      tipo: 'clasificar',
      enunciado: '¿Qué tipo de palabra es?',
      palabra: w.word,
      clase: w.cls,
      opciones: opts.map((o) => LABEL[o]),
      respuesta: LABEL[w.cls],
      dificultad: clamp(w.tier + (hasAccentMark(w.word) ? 0 : 1)),
      skills: ['clasificacion', skillOf(w)],
      explicacion: `${w.syl.join('-')}: la sílaba tónica es «${w.syl[w.stress]}», ${posName}, así que es ${LABEL[w.cls]}.`,
      regla_id: 'clasificacion',
    };
  };

function skillOf(w: Word): string {
  if (w.cls === null) return 'monosilabos';
  if (w.cls === 'aguda') return 'agudas';
  if (w.cls === 'llana') return 'llanas';
  return 'esdrujulas';
}

const mkElegir =
  (skill: string, regla: string, extraTier = 0): Make =>
  (w) => {
    if (W.AMBIGUAS.has(w.word)) return null;
    const wrong = shuffle(misspellings(w), hash(w.word)).slice(0, 2);
    if (wrong.length === 0) return null;
    const opts = shuffle([w.word, ...wrong], hash(w.word) + 7);
    return {
      tipo: 'elegir',
      enunciado: '¿Cuál está bien escrita?',
      palabra: w.word,
      ...(w.cls ? { clase: w.cls } : {}),
      opciones: opts,
      respuesta: w.word,
      dificultad: clamp(w.tier + extraTier),
      skills: [skill],
      explicacion: w.cls === null ? explainMono(w.word) : explainAccent(w.word, w.stress),
      regla_id: regla,
    };
  };

function explainMono(word: string): string {
  return `«${word}» tiene una sola sílaba. Los monosílabos no llevan tilde, salvo los de la tilde diacrítica (tú, él, sí…).${
    W.MONOSILABOS_TRAMPA.has(word) ? ` Aunque te suene raro, «${word}» se escribe sin tilde.` : ''
  }`;
}

const mkPonerTilde =
  (skill: string, regla: string, extraTier = 1): Make =>
  (w) => {
    if (w.cls === null || W.AMBIGUAS.has(w.word)) return null;
    const idx = [...w.word].findIndex((c) => hasAccentMark(c));
    return {
      tipo: 'poner_tilde',
      enunciado: 'Toca la vocal que lleva tilde (o «No lleva tilde»)',
      palabra: w.word,
      clase: w.cls,
      respuesta: idx,
      dificultad: clamp(w.tier + extraTier),
      skills: [skill],
      explicacion: explainAccent(w.word, w.stress),
      regla_id: regla,
    };
  };

const mkExplica: Make = (w) => {
  const r = reason(w);
  const has = hasAccentMark(w.word);
  // Si la palabra tiene hiato, «es aguda en -s → lleva tilde» también parecería cierto (país):
  // quitamos esas razones de los distractores para que solo haya una respuesta válida.
  const pool = ALL_REASONS.filter(
    (x) => x !== r.text && x !== R.mono && !(r.regla === 'hiatos' && (x === R.agudaSi || x === R.llanaSi)),
  );
  const wrong = shuffle(pool, hash(w.word) + 3).slice(0, 2);
  return {
    tipo: 'explica_regla',
    enunciado: has ? `¿Por qué «${w.word}» lleva tilde?` : `¿Por qué «${w.word}» no lleva tilde?`,
    palabra: w.word,
    ...(w.cls ? { clase: w.cls } : {}),
    opciones: shuffle([r.text, ...wrong], hash(w.word) + 5),
    respuesta: r.text,
    dificultad: clamp(w.tier + 1),
    skills: ['reglas', skillOf(w)],
    explicacion: w.cls === null ? explainMono(w.word) : explainAccent(w.word, w.stress),
    regla_id: r.regla,
  };
};

const mkDiptongoHiato: Make = (w) => {
  // Busca la secuencia de vocales (incluida la -y final de los triptongos: U-ru-guay, buey).
  const m = /[aeiouáéíóúü]{1,2}y(?![aeiouáéíóú])|[aeiouáéíóúü]{2,3}|[aeiouáéíóú]h[aeiouáéíóú]/i.exec(w.word);
  if (!m) return null;
  const seq = m[0];
  // ¿Las vocales caen en la misma sílaba?
  const sameSyl = w.syl.some((s) => s.toLowerCase().includes(seq.toLowerCase()));
  const kind = sameSyl ? (seq.replace(/h/gi, '').length === 3 ? 'triptongo' : 'diptongo') : 'hiato';
  const why =
    kind === 'triptongo'
      ? 'tres vocales (cerrada + abierta + cerrada) en la misma sílaba'
      : kind === 'diptongo'
        ? 'una vocal cerrada (i, u) sin tilde junto a otra vocal, en la misma sílaba'
        : /[íú]/i.test(seq)
          ? 'la i o la u lleva el golpe de voz, así que se separan (y llevan tilde)'
          : 'dos vocales abiertas (a, e, o) juntas siempre van en sílabas distintas';
  return {
    tipo: 'diptongo_hiato',
    enunciado: `En «${w.word}», las vocales «${seq}» forman…`,
    palabra: w.word,
    ...(w.cls ? { clase: w.cls } : {}),
    opciones: ['diptongo', 'hiato', 'triptongo'],
    respuesta: kind,
    dificultad: clamp(w.tier + (kind === 'hiato' ? 1 : 0)),
    skills: [kind === 'hiato' ? 'hiatos' : 'diptongos'],
    explicacion: `${w.syl.join('-')}: es ${kind} porque hay ${why}.`,
    regla_id: kind === 'hiato' ? 'hiatos' : 'diptongos',
  };
};

function hash(s: string): number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// ---------- Montaje de unidades ----------

function build(unit: string, words: Word[], makers: Make[], max: number): Item[] {
  const raw: Omit<Item, 'id'>[] = [];
  for (const w of words) for (const mk of makers) {
    const it = mk(w);
    if (it) raw.push(it);
  }
  const uniq = uniqueBy(raw, (i) => `${i.tipo}|${i.palabra}`);
  const chosen = shuffle(uniq, hash(unit)).slice(0, max);
  chosen.sort((a, b) => a.dificultad - b.dificultad);
  return chosen.map((it, i) => ({ id: `${unit}-${String(i + 1).padStart(4, '0')}`, ...it }));
}

const agudas = uniqueBy([...fromTiers(W.AGUDAS_CON_TILDE), ...fromTiers(W.AGUDAS_SIN_TILDE)], (w) => w.word);
const llanas = uniqueBy([...fromTiers(W.LLANAS_CON_TILDE), ...fromTiers(W.LLANAS_SIN_TILDE)], (w) => w.word);
const esdr = uniqueBy([...fromTiers(W.ESDRUJULAS)], (w) => w.word);
const sobres = fromList(W.SOBRESDRUJULAS, 3);
const hiatosAc = uniqueBy(fromTiers(W.HIATOS_ACENTUALES), (w) => w.word);
const diptongos = fromList(W.DIPTONGOS, 1);
const triptongos = fromList(W.TRIPTONGOS, 3);
const hiatosSimples = fromList(W.HIATOS_SIMPLES, 2);
// Los monosílabos «trampa» (fue, dio, guion…) son más difíciles: mucha gente les pone tilde.
const monos = fromList(W.MONOSILABOS, 1).map((w) => (W.MONOSILABOS_TRAMPA.has(w.word) ? { ...w, tier: 2 } : w));

const regular = (ws: Word[]) => ws.filter((w) => !/[aeiouáéíóúü]{2}/i.test(w.word) && !/h/i.test(w.word) && /^[a-zñáéíóú]/.test(w.word));
const isSpecial = (w: Word) => {
  const l = stripAccents(w.word.toLowerCase());
  return w.tier === 3 && (/y$/.test(l) || /[^aeiou][sn]$/.test(l));
};

const units: Record<string, Item[]> = {
  A1: build('A1', [...regular(llanas), ...regular(agudas), ...regular(esdr)], [mkSeparar], 90),
  A2: build('A2', [...llanas, ...agudas, ...esdr, ...sobres].filter((w) => !isSpecial(w)), [mkTonica], 80),
  A3: build('A3', [...llanas, ...agudas, ...esdr].filter((w) => !isSpecial(w)), [mkClasificar(false)], 100),
  A4: build('A4', agudas.filter((w) => !isSpecial(w)), [mkElegir('agudas', 'agudas'), mkPonerTilde('agudas', 'agudas'), mkExplica], 90),
  A5: build('A5', llanas.filter((w) => !isSpecial(w)), [mkElegir('llanas', 'llanas'), mkPonerTilde('llanas', 'llanas'), mkExplica], 90),
  A6: build('A6', [...esdr, ...sobres], [mkElegir('esdrujulas', 'esdrujulas'), mkPonerTilde('esdrujulas', 'esdrujulas'), mkClasificar(true)], 70),
  A7: build('A7', [...agudas, ...llanas].filter(isSpecial), [mkElegir('casos_especiales', 'casos-especiales', 0), mkExplica], 50),
  A8: build('A8', [...diptongos, ...triptongos, ...hiatosSimples], [mkDiptongoHiato, mkSeparar], 70),
  A9: build('A9', [...hiatosAc, ...hiatosSimples], [mkElegir('hiatos', 'hiatos'), mkPonerTilde('hiatos', 'hiatos'), mkDiptongoHiato, mkExplica], 80),
  A10: build('A10', monos, [mkElegir('monosilabos', 'monosilabos')], 40),
};

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [unit, items] of Object.entries(units)) {
  writeFileSync(`${OUT}${unit}.json`, JSON.stringify({ unidad: unit, items }, null, 1) + '\n');
  total += items.length;
  console.log(`${unit}: ${items.length} ítems`);
}
// Índice de unidades con contenido (lo usa la app para saber qué cargar).
const available = readdirSync(OUT)
  .filter((f) => /^[AB]\d+\.json$/.test(f))
  .map((f) => f.replace('.json', ''));
const counts = Object.fromEntries(
  available.map((u) => [u, (JSON.parse(readFileSync(`${OUT}${u}.json`, 'utf8')) as { items: unknown[] }).items.length]),
);
writeFileSync(`${OUT}index.json`, JSON.stringify({ unidades: counts }, null, 1) + '\n');
console.log(`Total generado: ${total}`);
