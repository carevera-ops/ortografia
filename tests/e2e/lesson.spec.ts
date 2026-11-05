import { expect, test, type Page } from '@playwright/test';

/** Responde lo que haya en pantalla (no importa si bien o mal) y avanza. */
async function answerAny(page: Page) {
  const area = page.locator('.exercise-area');
  const first = area.locator('button:not([disabled])').first();
  await first.click();
  await page.getByRole('button', { name: 'Comprobar' }).click();
  await expect(page.locator('.feedback')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
}

test('se puede jugar una lección completa y ver el resultado', async ({ page }) => {
  await page.goto('./#/camino');
  await page.getByRole('button', { name: /Nivel 1: disponible/ }).first().click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  for (let i = 0; i < 40; i++) {
    // Esperamos a que haya una pregunta o el resultado final.
    await page.locator('.exercise-area button:not([disabled]), #result-title').first().waitFor();
    if (await page.locator('#result-title').isVisible()) break;
    await answerAny(page);
  }
  await expect(page.getByText('aciertos')).toBeVisible();
  await expect(page.getByText('XP', { exact: true })).toBeVisible();
  // Al terminar la primera lección del día aparece la llama de la racha.
  await expect(page.getByRole('heading', { name: '¡Racha de 1 día!' })).toBeVisible();
  await page.getByRole('button', { name: '¡Vamos!' }).click();
  // El nivel 1 queda completado y se abre el 2
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('button', { name: /Nivel 1: completado/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Nivel 2: disponible/ }).first()).toBeVisible();
});

test('práctica libre y teoría', async ({ page }) => {
  await page.goto('./#/practica');
  await answerAny(page);
  await page.getByRole('button', { name: 'Terminar' }).click();
  await expect(page.getByText('aciertos')).toBeVisible();
  // La práctica libre no es una lección, pero con 5 minutos también contaría para la racha.
  await page.goto('./#/teoria');
  await page.getByText('La tilde en las agudas').click();
  await expect(page.getByText('Las agudas llevan tilde cuando acaban en vocal')).toBeVisible();
});
