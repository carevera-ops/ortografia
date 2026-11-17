import type { Page } from '@playwright/test';

/**
 * Responde la pregunta que haya en pantalla (no importa si bien o mal), sea del tipo que sea:
 * opciones, letras, cortes, fichas de sílabas o escribir una palabra.
 */
export async function answerCurrent(page: Page): Promise<void> {
  const area = page.locator('.exercise-area');
  // Esperar a que la pregunta esté pintada (las lecciones se preparan de forma asíncrona).
  await area.locator('button:not([disabled]), .dictation-input').first().waitFor();
  if (await area.locator('.tiles').count()) {
    const tiles = area.locator('.tiles .tile:not([disabled])');
    while (await tiles.count()) await tiles.first().click();
    return;
  }
  if (await area.locator('.dictation-input').count()) {
    await area.locator('.dictation-input').fill('respuesta');
    return;
  }
  await area.locator('button:not([disabled])').first().click();
}

/** Espera a que haya una pregunta lista para responder o al resultado final. */
export async function waitQuestionOrResult(page: Page): Promise<'question' | 'result'> {
  await page.locator('.exercise-area button:not([disabled]), .exercise-area .dictation-input, #result-title').first().waitFor();
  return (await page.locator('#result-title').isVisible()) ? 'result' : 'question';
}
