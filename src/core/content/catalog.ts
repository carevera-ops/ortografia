/**
 * Catálogo del temario: unidades en el orden del camino.
 * Los ítems de cada unidad viven en public/content/<id>.json.
 */
export type Block = 'A' | 'B';

export interface UnitInfo {
  id: string;
  block: Block;
  title: string;
  /** Descripción corta para el niño. */
  subtitle: string;
  emoji: string;
  levels: number;
}

const A = (id: string, title: string, subtitle: string, emoji: string, levels = 4): UnitInfo => ({
  id,
  block: 'A',
  title,
  subtitle,
  emoji,
  levels,
});
const B = (id: string, title: string, subtitle: string, emoji: string, levels = 3): UnitInfo => ({
  id,
  block: 'B',
  title,
  subtitle,
  emoji,
  levels,
});

/** Orden del camino: acentuación primero, con ortografía general intercalada desde A4. */
export const UNITS: UnitInfo[] = [
  A('A1', 'Las sílabas', 'Aprende a separar palabras en sílabas', '✂️'),
  A('A2', 'La sílaba tónica', '¿Dónde suena más fuerte?', '📣'),
  A('A3', 'Agudas, llanas y esdrújulas', 'Clasifica las palabras', '🗂️'),
  A('A4', 'Tilde en las agudas', 'camión, café, compás', '🎯'),
  B('B1', 'B o V · M antes de P y B', 'barco, vaso, campo, hombre', '🅱️'),
  A('A5', 'Tilde en las llanas', 'árbol, lápiz, fácil', '🌳'),
  B('B2', 'G o J', 'gente, jirafa, coger', '🦒'),
  A('A6', 'Esdrújulas y sobresdrújulas', 'música, pájaro, dígamelo', '🎵'),
  B('B3', 'La H', 'hielo, ahora, huevo', '🥚'),
  A('A7', 'Casos especiales', 'bíceps, cómics, robots', '🧩', 3),
  A('A8', 'Diptongos y triptongos', 'cielo, puerta, buey', '🔗'),
  B('B4', 'LL o Y · R o RR', 'lluvia, playa, perro', '🌧️'),
  A('A9', 'Hiatos', 'país, búho, reír', '🦉'),
  A('A10', 'Monosílabos', 'fue, dio, vio, guion', '1️⃣', 3),
  B('B5', 'C, Z, S o X', 'cielo, zapato, examen', '🦓'),
  A('A11', 'Tilde diacrítica', 'tú/tu, él/el, sí/si', '⚖️'),
  A('A12', 'Preguntas y exclamaciones', 'qué, cómo, dónde', '❓'),
  B('B6', 'Homófonos', 'hay, ahí, ay · echo, hecho', '👯'),
  A('A13', 'Por qué, porque, porqué', 'Las cuatro formas', '🤔', 3),
  A('A14', 'Solo y los demostrativos', 'solo, este, aquel sin tilde', '👉', 3),
  A('A15', '-mente, compuestos y pronombres', 'fácilmente, dímelo', '🧱', 3),
  B('B7', 'Mayúsculas y puntuación', '¿¡ y mayúsculas iniciales', '🔠'),
  A('A16', 'Mayúsculas con tilde y gran repaso', 'Álvaro, ÁFRICA', '🏆', 3),
];

export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));

/** Nombres de las habilidades para mostrar en "Mi progreso". */
export const SKILL_LABEL: Record<string, string> = {
  silabas: 'Sílabas',
  tonica: 'Sílaba tónica',
  clasificacion: 'Agudas, llanas…',
  agudas: 'Tilde en agudas',
  llanas: 'Tilde en llanas',
  esdrujulas: 'Esdrújulas',
  reglas: 'Explicar la regla',
  casos_especiales: 'Casos especiales',
  diptongos: 'Diptongos',
  hiatos: 'Hiatos',
  monosilabos: 'Monosílabos',
  diacritica: 'Tilde diacrítica',
  interrogativos: 'Interrogativos',
  porque: 'Por qué / porque',
  solo_demostrativos: 'Solo y demostrativos',
  mente_compuestos: '-mente y compuestos',
  mayusculas_tilde: 'Mayúsculas con tilde',
  dictado: 'Dictado',
  b_v: 'B o V',
  g_j: 'G o J',
  h: 'La H',
  ll_y: 'LL o Y',
  r_rr: 'R o RR',
  c_z: 'C, Z o S',
  x_s: 'X o S',
  homofonos: 'Homófonos',
  mayusculas: 'Mayúsculas',
  puntuacion: 'Puntuación',
};
