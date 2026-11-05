import { RulesFileSchema, UnitFileSchema, type Item, type Rule } from './schema';

/** Carga del contenido (JSON precargado por el service worker). */
const base = import.meta.env.BASE_URL;
const unitCache = new Map<string, Promise<Item[]>>();
let rulesCache: Promise<Map<string, Rule>> | null = null;
let indexCache: Promise<Record<string, number>> | null = null;

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${base}content/${path}`);
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  return res.json();
}

/** Unidades con contenido y su número de ítems. */
export function loadIndex(): Promise<Record<string, number>> {
  indexCache ??= getJson('index.json')
    .then((j) => (j as { unidades: Record<string, number> }).unidades)
    .catch((e) => {
      indexCache = null;
      throw e;
    });
  return indexCache;
}

export function loadUnit(unitId: string): Promise<Item[]> {
  let p = unitCache.get(unitId);
  if (!p) {
    p = getJson(`${unitId}.json`).then((j) => UnitFileSchema.parse(j).items);
    p.catch(() => unitCache.delete(unitId));
    unitCache.set(unitId, p);
  }
  return p;
}

export async function loadUnits(ids: string[]): Promise<Item[]> {
  return (await Promise.all(ids.map(loadUnit))).flat();
}

export function loadRules(): Promise<Map<string, Rule>> {
  rulesCache ??= getJson('reglas.json').then((j) => new Map(RulesFileSchema.parse(j).reglas.map((r) => [r.id, r])));
  return rulesCache;
}

/** Busca ítems por id en las unidades indicadas. */
export async function findItems(ids: string[]): Promise<Item[]> {
  const units = [...new Set(ids.map((id) => id.split('-')[0]!))];
  const all = await loadUnits(units);
  const byId = new Map(all.map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
}
