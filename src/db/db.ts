import Dexie, { type EntityTable } from 'dexie';
import type {
  Achievement,
  Attempt,
  DailyStat,
  LevelProgress,
  SavedReport,
  Settings,
  SkillMastery,
  SrsCard,
  StreakState,
  StudySession,
} from './types';

/** Base de datos local de Tildín. Todo se queda en el dispositivo. */
export class TildinDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  levelProgress!: Dexie.Table<LevelProgress, [string, number]>;
  skillMastery!: EntityTable<SkillMastery, 'skill'>;
  srsCards!: EntityTable<SrsCard, 'itemId'>;
  attempts!: EntityTable<Attempt, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  dailyStats!: EntityTable<DailyStat, 'date'>;
  streakState!: EntityTable<StreakState, 'id'>;
  achievements!: EntityTable<Achievement, 'id'>;
  reports!: EntityTable<SavedReport, 'id'>;

  constructor(name = 'tildin') {
    super(name);
    // Versión 1 del esquema. Si cambia, añadir .version(2) con su migración.
    this.version(1).stores({
      settings: 'id',
      levelProgress: '[unitId+level], unitId',
      skillMastery: 'skill',
      srsCards: 'itemId, due',
      attempts: '++id, itemId, sessionId, date, target',
      sessions: 'id, date, kind',
      dailyStats: 'date',
      streakState: 'id',
      achievements: 'id',
    });
    // Versión 2: informes de seguimiento recibidos de otros dispositivos.
    this.version(2).stores({
      reports: '++id, childId, at',
    });
  }
}

export const db = new TildinDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'main',
  streakCriterion: 'either',
  streakMinutes: 5,
  dailyGoalMin: 10,
  sound: true,
  theme: 'auto',
  pinHash: null,
  pinSalt: null,
  unlockAll: false,
  childId: null,
  childAlias: null,
  lastBackupAt: null,
  createdAt: new Date(0).toISOString(),
};

/** Devuelve los ajustes y los crea con valores por defecto la primera vez. */
export async function getSettings(database: TildinDB = db): Promise<Settings> {
  const s = await database.settings.get('main');
  if (s) return { ...DEFAULT_SETTINGS, ...s };
  const fresh: Settings = { ...DEFAULT_SETTINGS, createdAt: new Date().toISOString() };
  await database.settings.put(fresh);
  return fresh;
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>, database: TildinDB = db) {
  const current = await getSettings(database);
  await database.settings.put({ ...current, ...patch, id: 'main' });
}
