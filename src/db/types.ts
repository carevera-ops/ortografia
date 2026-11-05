/** Tipos de los registros guardados en IndexedDB. */

export type StreakCriterion = 'lesson' | 'minutes';

export interface Settings {
  id: 'main';
  /** Qué hace falta para que un día cuente en la racha. */
  streakCriterion: StreakCriterion;
  /** Minutos de estudio activo si el criterio es "minutes". */
  streakMinutes: number;
  /** Objetivo diario en minutos (0 = sin objetivo). */
  dailyGoalMin: 0 | 10 | 15 | 20 | 30;
  sound: boolean;
  theme: 'auto' | 'light' | 'dark';
  /** Hash SHA-256 del PIN de padres (null = sin configurar). */
  pinHash: string | null;
  /** Fecha ISO de la última copia de seguridad exportada. */
  lastBackupAt: string | null;
  createdAt: string;
}

export interface LevelProgress {
  unitId: string;
  level: number;
  bestPct: number;
  completed: boolean;
  /** true si se desbloqueó con la prueba de nivel. */
  skipped: boolean;
  attempts: number;
  updatedAt: string;
}

export interface SkillMastery {
  skill: string;
  /** Dominio 0–100. */
  mastery: number;
  attempts: number;
  correct: number;
  updatedAt: string;
}

export interface SrsCard {
  itemId: string;
  /** Caja de Leitner (1–5). */
  box: number;
  /** Fecha local YYYY-MM-DD del próximo repaso. */
  due: string;
  lapses: number;
  lastSeen: string;
}

export interface Attempt {
  id?: number;
  itemId: string;
  sessionId: string;
  /** Palabra o forma objetivo (para el "top de palabras que más me cuestan"). */
  target: string;
  correct: boolean;
  given: string;
  skills: string[];
  difficulty: number;
  ms: number;
  /** Fecha local YYYY-MM-DD. */
  date: string;
  at: string;
}

export type SessionKind = 'lesson' | 'practice' | 'placement' | 'review';

export interface StudySession {
  id: string;
  kind: SessionKind;
  unitId: string | null;
  level: number | null;
  startedAt: string;
  endedAt: string;
  /** Segundos de estudio activo (con pausas descontadas). */
  activeSec: number;
  questions: number;
  correct: number;
  xp: number;
  skills: string[];
  finished: boolean;
  /** Fecha local YYYY-MM-DD de inicio. */
  date: string;
}

export interface DailyStat {
  /** Fecha local YYYY-MM-DD. */
  date: string;
  activeSec: number;
  lessons: number;
  xp: number;
  questions: number;
  correct: number;
  /** true si ese día se gastó un protector de racha. */
  freezeUsed: boolean;
}

export interface StreakState {
  id: 'main';
  current: number;
  best: number;
  freezes: number;
  /** Último día (YYYY-MM-DD) que contó para la racha. */
  lastDay: string | null;
  computedAt: string;
}

export interface Achievement {
  id: string;
  unlockedAt: string;
}
