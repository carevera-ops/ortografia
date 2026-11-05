import { z } from 'zod';
import { db, type TildinDB } from './db';

/**
 * Copia de seguridad del progreso en un archivo JSON.
 * Incluye todas las tablas; al importar se valida el archivo y se REEMPLAZA el progreso actual.
 */
export const BACKUP_APP = 'tildin';
export const BACKUP_VERSION = 1;

const TABLES = ['settings', 'levelProgress', 'skillMastery', 'srsCards', 'attempts', 'sessions', 'dailyStats', 'streakState', 'achievements', 'reports'] as const;
type TableName = (typeof TABLES)[number];

const rows = z.array(z.record(z.string(), z.unknown()));
export const BackupSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string(),
  tables: z.object({
    settings: rows,
    levelProgress: z.array(z.object({ unitId: z.string(), level: z.number() }).passthrough()),
    skillMastery: z.array(z.object({ skill: z.string(), mastery: z.number() }).passthrough()),
    srsCards: z.array(z.object({ itemId: z.string(), box: z.number(), due: z.string() }).passthrough()),
    attempts: z.array(z.object({ itemId: z.string(), correct: z.boolean() }).passthrough()),
    sessions: z.array(z.object({ id: z.string() }).passthrough()),
    dailyStats: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), activeSec: z.number() }).passthrough()),
    streakState: rows,
    achievements: z.array(z.object({ id: z.string() }).passthrough()),
    // Añadido en la versión 2 de la base de datos: las copias antiguas no lo traen.
    reports: z.array(z.object({ childId: z.string(), at: z.string() }).passthrough()).default([]),
  }),
});
export type Backup = z.infer<typeof BackupSchema>;

export async function exportBackup(database: TildinDB = db): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>;
  for (const t of TABLES) tables[t] = await database.table(t).toArray();
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables: tables as Backup['tables'] };
}

/** Resumen legible de una copia (para confirmar antes de importar). */
export function describeBackup(b: Backup): { exportedAt: string; days: number; lessons: number; xp: number } {
  const days = b.tables.dailyStats as { lessons?: number; xp?: number }[];
  return {
    exportedAt: b.exportedAt,
    days: days.length,
    lessons: days.reduce((a, d) => a + (d.lessons ?? 0), 0),
    xp: days.reduce((a, d) => a + (d.xp ?? 0), 0),
  };
}

export function parseBackup(text: string): Backup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es una copia de seguridad válida (no es JSON).');
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success) throw new Error('El archivo no es una copia de seguridad de Tildín o está dañado.');
  return r.data;
}

/** Reemplaza todo el progreso por el de la copia. Conserva el PIN actual si la copia no trae uno. */
export async function importBackup(b: Backup, database: TildinDB = db): Promise<void> {
  const current = await database.settings.get('main');
  await database.transaction('rw', TABLES.map((t) => database.table(t)), async () => {
    for (const t of TABLES) {
      await database.table(t).clear();
      if (b.tables[t].length) await database.table(t).bulkPut(b.tables[t]);
    }
    const s = await database.settings.get('main');
    if (s && !s.pinHash && current?.pinHash) await database.settings.put({ ...s, pinHash: current.pinHash, pinSalt: current.pinSalt });
  });
}

/** Borra todo el progreso (conserva los ajustes y el PIN). */
export async function resetProgress(database: TildinDB = db): Promise<void> {
  const keep = TABLES.filter((t) => t !== 'settings');
  await database.transaction('rw', keep.map((t) => database.table(t)), async () => {
    for (const t of keep) await database.table(t).clear();
  });
}

export function backupFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `tildin-copia-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/**
 * Comparte el archivo con la hoja de compartir de iOS (Guardar en Archivos, AirDrop, WhatsApp…)
 * o, si no se puede, lo descarga.
 */
export async function shareOrDownload(b: Backup): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName();
  const text = JSON.stringify(b);
  const file = new File([text], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de seguridad de Tildín' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}

/** ¿Toca recordar hacer una copia? (nunca hecha o hace más de 14 días, y hay progreso). */
export function backupDue(lastBackupAt: string | null, studiedDays: number, now = new Date()): boolean {
  if (studiedDays < 3) return false;
  if (!lastBackupAt) return true;
  return now.getTime() - new Date(lastBackupAt).getTime() > 14 * 86_400_000;
}
