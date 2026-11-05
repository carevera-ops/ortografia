import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await page.evaluate(async () => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('tildin');
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction(['dailyStats', 'skillMastery'], 'readwrite');
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      tx.objectStore('dailyStats').put({ date: fmt(d), activeSec: 900, lessons: 2, xp: 60, questions: 30, correct: 27, freezeUsed: false });
    }
    tx.objectStore('skillMastery').put({ skill: 'agudas', mastery: 70, attempts: 40, correct: 35, updatedAt: '' });
    await new Promise((r) => (tx.oncomplete = r));
    db.close();
  });
}

test('seguimiento: código en el iPhone del niño → informe guardado en otro dispositivo', async ({ page, browser }) => {
  await seed(page);
  await page.goto('./#/padres');
  for (const _ of [0, 1]) for (const d of '1357') await page.locator('.pin-key', { hasText: new RegExp(`^${d}$`) }).click();
  await page.getByLabel('Nombre que aparecerá en el informe (opcional)').fill('Pablo');
  await page.getByRole('button', { name: '📲 Generar código de seguimiento' }).click();
  await expect(page.getByRole('img', { name: 'Código QR con el informe de seguimiento' })).toBeVisible();
  const url = await page.locator('a.report-link').getAttribute('href');
  expect(url).toContain('#/informe/');

  // «Otro dispositivo»: un contexto nuevo, sin los datos del niño.
  const parent = await browser.newContext();
  const p2 = await parent.newPage();
  await p2.goto(url!);
  await expect(p2.getByRole('heading', { name: 'Progreso de Pablo' })).toBeVisible();
  await expect(p2.getByText('7/7')).toBeVisible();
  await expect(p2.getByText('🔥 10')).toBeVisible();
  await expect(p2.getByText('Tilde en agudas')).toBeVisible();
  await p2.getByRole('button', { name: '💾 Guardar para ver la evolución' }).click();
  await expect(p2.getByText('✔ Guardado en este dispositivo.')).toBeVisible();
  await p2.getByRole('link', { name: 'Ver informes guardados' }).click();
  await expect(p2.getByRole('heading', { name: 'Pablo' })).toBeVisible();
  await expect(p2.getByText('1 informe')).toBeVisible();
  await parent.close();
});

test('un código estropeado muestra un aviso', async ({ page }) => {
  await page.goto('./#/informe/estonoesuncodigo');
  await expect(page.getByText('El código de seguimiento no es válido o está incompleto.')).toBeVisible();
});
