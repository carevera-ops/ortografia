import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

async function typePin(page: Page, pin: string) {
  for (const d of pin) await page.locator('.pin-key', { hasText: new RegExp(`^${d}$`) }).click();
}

const goal = (page: Page, name: string) => page.getByRole('radiogroup', { name: 'Objetivo diario' }).getByRole('radio', { name });

async function enterParents(page: Page, pin = '2468', create = true) {
  await page.goto('./#/padres');
  if (create) {
    await expect(page.getByRole('heading', { name: 'Crea un PIN de padres' })).toBeVisible();
    await typePin(page, pin);
    await expect(page.getByRole('heading', { name: 'Repite el PIN' })).toBeVisible();
    await typePin(page, pin);
  } else {
    await typePin(page, pin);
  }
  await expect(page.getByRole('heading', { name: 'Resumen de la semana' })).toBeVisible();
}

test('PIN: crear, cerrar, fallar y volver a entrar', async ({ page }) => {
  await enterParents(page);
  await page.getByRole('button', { name: '🔒 Cerrar' }).click();
  await typePin(page, '1111');
  await expect(page.getByText('PIN incorrecto.')).toBeVisible();
  await typePin(page, '2468');
  await expect(page.getByRole('heading', { name: 'Resumen de la semana' })).toBeVisible();
});

test('desbloquear todo abre las unidades del camino', async ({ page }) => {
  await enterParents(page);
  await page.getByText('🔓 Desbloquear todas las unidades').click();
  await page.getByRole('link', { name: 'Camino', exact: true }).click();
  await expect(page.getByRole('button', { name: /Nivel 1: disponible/ })).toHaveCount(23);
  await expect(page.getByRole('button', { name: /bloqueado/ })).toHaveCount(0);
  // Se puede entrar directamente en una unidad avanzada
  await page.getByRole('button', { name: /Nivel 3/ }).last().click();
  await expect(page.getByRole('progressbar')).toBeVisible();
});

test('copia de seguridad: exportar, reiniciar y restaurar', async ({ page }, testInfo) => {
  await enterParents(page);
  // Algo de progreso: el objetivo diario cambia y queda en la copia.
  await goal(page, '30 min').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '📤 Exportar copia' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^tildin-copia-\d{4}-\d{2}-\d{2}\.json$/);
  const file = testInfo.outputPath('copia.json');
  await download.saveAs(file);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.app).toBe('tildin');
  expect(json.tables.settings[0].dailyGoalMin).toBe(30);
  await expect(page.getByText(/Última copia: \d/)).toBeVisible();

  // Cambiamos algo y restauramos
  await goal(page, '10 min').click();
  await page.locator('input[type=file]').setInputFiles(file);
  await expect(page.getByRole('heading', { name: '¿Restaurar esta copia?' })).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(page.getByText('✔ Copia restaurada.')).toBeVisible();
  await expect(goal(page, '30 min')).toHaveAttribute('aria-checked', 'true');

  // Un archivo que no es una copia se rechaza
  const bad = testInfo.outputPath('malo.json');
  writeFileSync(bad, '{"hola":1}');
  await page.locator('input[type=file]').setInputFiles(bad);
  await expect(page.getByText(/no es una copia de seguridad de Tildín/)).toBeVisible();

  // Reiniciar exige escribir BORRAR
  await page.getByRole('button', { name: 'Reiniciar progreso…' }).click();
  const confirm = page.getByRole('button', { name: 'Borrar todo el progreso' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Escribe BORRAR para confirmar').fill('borrar');
  await confirm.click();
  await expect(page.getByText('✔ Progreso borrado.')).toBeVisible();
});

test('insignia nueva al terminar la primera lección', async ({ page }) => {
  await page.goto('./#/leccion/A1/1');
  for (let i = 0; i < 40; i++) {
    await page.locator('.exercise-area button:not([disabled]), #result-title').first().waitFor();
    if (await page.locator('#result-title').isVisible()) break;
    await page.locator('.exercise-area button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await expect(page.getByText('¡Nueva insignia!')).toBeVisible();
  await expect(page.getByText('Primer paso')).toBeVisible();
});
