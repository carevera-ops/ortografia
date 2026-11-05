import { describe, expect, it } from 'vitest';
import {
  checkWord,
  classify,
  explainAccent,
  needsAccent,
  placeAccent,
  stressedSyllableIndex,
  stripAccents,
  syllabify,
  type StressClass,
} from '../../src/core/phonology/phonology';

/** Palabras de referencia con su separación silábica correcta. */
const SYLLABLES: Record<string, string> = {
  // Sílabas simples y grupos consonánticos
  casa: 'ca-sa',
  mesa: 'me-sa',
  perro: 'pe-rro',
  calle: 'ca-lle',
  coche: 'co-che',
  queso: 'que-so',
  guitarra: 'gui-ta-rra',
  guerra: 'gue-rra',
  pingüino: 'pin-güi-no',
  cigüeña: 'ci-güe-ña',
  agua: 'a-gua',
  árbol: 'ár-bol',
  libro: 'li-bro',
  hombre: 'hom-bre',
  tabla: 'ta-bla',
  África: 'Á-fri-ca',
  atleta: 'at-le-ta',
  instante: 'ins-tan-te',
  obstáculo: 'obs-tá-cu-lo',
  abstracto: 'abs-trac-to',
  instrumento: 'ins-tru-men-to',
  constelación: 'cons-te-la-ción',
  transporte: 'trans-por-te',
  examen: 'e-xa-men',
  taxi: 'ta-xi',
  extraño: 'ex-tra-ño',
  ñandú: 'ñan-dú',
  lápiz: 'lá-piz',
  reloj: 're-loj',
  ordenador: 'or-de-na-dor',
  murciélago: 'mur-cié-la-go',
  bicicleta: 'bi-ci-cle-ta',
  doctor: 'doc-tor',
  digno: 'dig-no',
  // Diptongos
  cielo: 'cie-lo',
  puerta: 'puer-ta',
  aire: 'ai-re',
  causa: 'cau-sa',
  ciudad: 'ciu-dad',
  ruido: 'rui-do',
  peine: 'pei-ne',
  boina: 'boi-na',
  después: 'des-pués',
  camión: 'ca-mión',
  canción: 'can-ción',
  huevo: 'hue-vo',
  cuídate: 'cuí-da-te',
  // Triptongos
  buey: 'buey',
  Uruguay: 'U-ru-guay',
  averiguáis: 'a-ve-ri-guáis',
  limpiéis: 'lim-piéis',
  miau: 'miau',
  // Y como vocal o consonante
  rey: 'rey',
  muy: 'muy',
  virrey: 'vi-rrey',
  hoy: 'hoy',
  ayer: 'a-yer',
  playa: 'pla-ya',
  mayo: 'ma-yo',
  // Hiatos
  leer: 'le-er',
  caos: 'ca-os',
  poeta: 'po-e-ta',
  héroe: 'hé-ro-e',
  océano: 'o-cé-a-no',
  país: 'pa-ís',
  día: 'dí-a',
  río: 'rí-o',
  reír: 're-ír',
  oído: 'o-í-do',
  baúl: 'ba-úl',
  búho: 'bú-ho',
  prohíbe: 'pro-hí-be',
  maíz: 'ma-íz',
  raíz: 'ra-íz',
  tenía: 'te-ní-a',
  chiita: 'chi-i-ta',
  zoo: 'zo-o',
  // Monosílabos
  sol: 'sol',
  pie: 'pie',
  fue: 'fue',
  guion: 'guion',
  truhan: 'truhan',
  prohibir: 'prohi-bir',
  ahumar: 'ahu-mar',
  rehusar: 'rehu-sar',
  alcohol: 'al-co-hol',
  ahí: 'a-hí',
  ahora: 'a-ho-ra',
  // Sobresdrújulas
  dígamelo: 'dí-ga-me-lo',
  cómetelo: 'có-me-te-lo',
};

describe('syllabify', () => {
  for (const [word, expected] of Object.entries(SYLLABLES)) {
    it(`${word} → ${expected}`, () => {
      expect(syllabify(word).join('-')).toBe(expected);
    });
  }
});

/** Palabras bien escritas con su clase acentual. */
const CLASSES: [string, StressClass][] = [
  ['camión', 'aguda'],
  ['café', 'aguda'],
  ['compás', 'aguda'],
  ['reloj', 'aguda'],
  ['pared', 'aguda'],
  ['comer', 'aguda'],
  ['virrey', 'aguda'],
  ['robots', 'aguda'],
  ['jabalí', 'aguda'],
  ['reír', 'aguda'],
  ['árbol', 'llana'],
  ['lápiz', 'llana'],
  ['fácil', 'llana'],
  ['casa', 'llana'],
  ['examen', 'llana'],
  ['martes', 'llana'],
  ['bíceps', 'llana'],
  ['cómics', 'llana'],
  ['fórceps', 'llana'],
  ['país', 'aguda'],
  ['día', 'llana'],
  ['búho', 'llana'],
  ['tenía', 'llana'],
  ['música', 'esdrujula'],
  ['pájaro', 'esdrujula'],
  ['murciélago', 'esdrujula'],
  ['océano', 'esdrujula'],
  ['dígamelo', 'sobresdrujula'],
  ['cómetelo', 'sobresdrujula'],
];

describe('checkWord: las palabras bien escritas pasan', () => {
  for (const [word, cls] of CLASSES) {
    it(`${word} es ${cls} y su tilde es correcta`, () => {
      expect(checkWord(word, cls)).toEqual({ ok: true });
    });
  }
});

describe('checkWord: las palabras mal escritas fallan', () => {
  const WRONG: [string, StressClass][] = [
    ['camion', 'aguda'],
    ['arbol', 'llana'],
    ['musica', 'esdrujula'],
    ['relój', 'aguda'],
    ['exámen', 'llana'],
    ['robóts', 'aguda'],
    ['biceps', 'llana'],
    ['virréy', 'aguda'],
    ['cuidáte', 'llana'],
  ];
  for (const [word, cls] of WRONG) {
    it(`${word} se detecta como error`, () => {
      expect(checkWord(word, cls).ok).toBe(false);
    });
  }
  it('tilde en la vocal equivocada de un diptongo', () => {
    expect(checkWord('camíon', 'aguda').ok).toBe(false);
    expect(checkWord('cúidate').ok).toBe(false);
  });
  it('monosílabos con tilde se marcan (la diacrítica va aparte)', () => {
    expect(checkWord('fué').ok).toBe(false);
    expect(checkWord('guión').ok).toBe(false);
  });
  it('palabra sin tilde y sin clase: no se puede validar', () => {
    expect(checkWord('arbol').ok).toBe(false);
  });
});

describe('needsAccent con la tónica marcada', () => {
  const cases: [string, boolean][] = [
    ['camión', true],
    ['relój', false],
    ['árbol', true],
    ['cása', false],
    ['música', true],
    ['país', true],
    ['búho', true],
    ['reír', true],
    ['ciudád', false],
    ['virréy', false],
    ['robóts', false],
    ['bíceps', true],
    ['jersé', true],
  ];
  for (const [w, exp] of cases) it(`${w} → ${exp}`, () => expect(needsAccent(w)).toBe(exp));
});

describe('otras utilidades', () => {
  it('stripAccents conserva ñ y ü', () => {
    expect(stripAccents('Álvaro pingüino niño')).toBe('Alvaro pingüino niño');
  });
  it('placeAccent pone la tilde en la vocal fuerte', () => {
    expect(placeAccent('camion', 1)).toBe('camión');
    expect(placeAccent('murcielago', 1)).toBe('murciélago');
    expect(placeAccent('cuidate', 0)).toBe('cuídate');
    expect(placeAccent('Africa', 0)).toBe('África');
  });
  it('sílaba tónica y clasificación', () => {
    expect(stressedSyllableIndex('casa')).toBe(0);
    expect(stressedSyllableIndex('comer')).toBe(1);
    expect(classify('pájaro')).toBe('esdrujula');
    expect(classify('ÁFRICA')).toBe('esdrujula');
  });
  it('explicaciones', () => {
    expect(explainAccent('camión')).toContain('aguda');
    expect(explainAccent('país')).toContain('hiato');
    expect(explainAccent('música')).toContain('esdrújula');
  });
  it('mayúsculas', () => {
    expect(syllabify('ÁFRICA').join('-')).toBe('Á-FRI-CA');
    expect(checkWord('ÁLVARO', 'esdrujula').ok).toBe(true);
  });
});
