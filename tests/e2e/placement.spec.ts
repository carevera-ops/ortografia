import { expect, test } from '@playwright/test';

test('prueba de nivel: se ofrece en la unidad actual y da resultado', async ({ page }) => {
  await page.goto('./#/camino');
  await page.getByRole('button', { name: '⏩ ¿Ya lo sabes? Prueba de nivel' }).first().click();
  await expect(page.getByText(/Prueba de nivel: necesitas un 85 %/)).toBeVisible();
  let n = 0;
  for (let i = 0; i < 20; i++) {
    await page.locator('.exercise-area button:not([disabled]), #result-title').first().waitFor();
    if (await page.locator('#result-title').isVisible()) break;
    await page.locator('.exercise-area button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    n++;
  }
  // 15 preguntas y sin repetir las falladas
  expect(n).toBe(15);
  await expect(page.getByText('Las sílabas · Prueba de nivel')).toBeVisible();
  const pct = Number((await page.getByText(/aciertos \(\d+ %\)/).textContent())!.match(/(\d+) %/)![1]);
  if (pct >= 85) await expect(page.getByText(/Has saltado la unidad/)).toBeVisible();
  else await expect(page.getByText(/Necesitabas un 85 %/)).toBeVisible();
});
