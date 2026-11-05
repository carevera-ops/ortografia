import { expect, test, type Page } from '@playwright/test';

/** Escribe días de estudio directamente en IndexedDB (como si se hubieran estudiado). */
async function seedDays(page: Page, days: { offset: number; min: number; lessons: number; q: number; c: number }[]) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await page.evaluate(async (rows) => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('tildin');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const tx = db.transaction('dailyStats', 'readwrite');
    for (const r of rows) {
      const d = new Date();
      d.setDate(d.getDate() + r.offset);
      tx.objectStore('dailyStats').put({ date: fmt(d), activeSec: r.min * 60, lessons: r.lessons, xp: r.q * 5, questions: r.q, correct: r.c, freezeUsed: false });
    }
    await new Promise((res) => (tx.oncomplete = res));
    db.close();
  }, days);
  await page.reload();
}

test('racha, protector y avisos en el inicio', async ({ page }) => {
  // 8 días seguidos hasta anteayer, ayer sin estudiar (se gasta el protector) y hoy nada aún.
  const rows = Array.from({ length: 8 }, (_, i) => ({ offset: -9 + i, min: 6, lessons: 1, q: 12, c: 10 }));
  await seedDays(page, rows);
  await expect(page.getByText('¡Tu racha de 8 días te espera!')).toBeVisible();
  await expect(page.getByRole('link', { name: /Racha de 8 días/ })).toBeVisible();
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByText('8 días', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/protector usado/)).toHaveCount(1);
  await expect(page.getByRole('img', { name: /últimos 7 días/ })).toBeVisible();
});

test('felicitación de día de campeón (20 min y > 90 %)', async ({ page }) => {
  await seedDays(page, [{ offset: 0, min: 21, lessons: 3, q: 40, c: 38 }]);
  // Primero sale la llama de la racha (y solo ella) y después la felicitación.
  await expect(page.getByRole('heading', { name: '¡Racha de 1 día!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Día de campeón!' })).toHaveCount(0);
  await page.getByRole('button', { name: '¡Vamos!' }).click();
  await expect(page.getByRole('heading', { name: '¡Día de campeón!' })).toBeVisible();
  await page.getByRole('button', { name: '¡Genial!' }).click();
  await expect(page.getByRole('heading', { name: '¡Día de campeón!' })).toHaveCount(0);
  // Solo una vez al día
  await page.reload();
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¡Día de campeón!' })).toHaveCount(0);
  await expect(page.getByText('¡Hoy has sido un campeón!')).toBeVisible();
});

test('sin campeón con menos del 90 %', async ({ page }) => {
  await seedDays(page, [{ offset: 0, min: 25, lessons: 3, q: 40, c: 35 }]);
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('heading', { name: '¡Día de campeón!' })).toHaveCount(0);
});

