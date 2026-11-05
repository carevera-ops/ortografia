import { expect, test } from '@playwright/test';

/** Simula una voz es-ES y guarda lo que se "dice" en window.__spoken. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const voice = { lang: 'es-ES', localService: true, name: 'Prueba', default: true, voiceURI: 'x' };
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [voice],
        speak: (u: { text: string }) => w.__spoken.push(u.text),
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      constructor(t: string) {
        this.text = t;
      }
    };
  });
});

test('dictado: escuchar, escribir con la barra de tildes y corregir', async ({ page }) => {
  await page.goto('./#/leccion/A16/3');
  let found = false;
  for (let i = 0; i < 14; i++) {
    await page.locator('.exercise-area button:not([disabled]), #result-title').first().waitFor();
    if (await page.locator('#result-title').isVisible()) break;
    if (await page.locator('.dictation-input').isVisible()) {
      found = true;
      await page.getByRole('button', { name: 'Escuchar la palabra' }).click();
      const word = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
      expect(word).toBeTruthy();
      // Escribimos las letras normales con el teclado y las acentuadas con la barra.
      const input = page.locator('.dictation-input');
      await expect(input).toHaveAttribute('autocorrect', 'off');
      await expect(input).toHaveAttribute('spellcheck', 'false');
      for (const ch of word) {
        if ('áéíóúüñ'.includes(ch)) await page.locator('.accent-key', { hasText: ch }).click();
        else await input.press(ch === ch.toUpperCase() && ch !== ch.toLowerCase() ? `Shift+${ch}` : ch);
      }
      await expect(input).toHaveValue(word);
      await page.getByRole('button', { name: 'Comprobar' }).click();
      await expect(page.locator('.feedback.correct')).toBeVisible();
      break;
    }
    await page.locator('.exercise-area button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  expect(found).toBe(true);
});

test('detectar el error y completar el hueco funcionan', async ({ page }) => {
  await page.goto('./#/leccion/A11/3');
  const seen = new Set<string>();
  for (let i = 0; i < 14 && seen.size < 2; i++) {
    await page.locator('.exercise-area button:not([disabled]), #result-title').first().waitFor();
    if (await page.locator('#result-title').isVisible()) break;
    if (await page.locator('.tokens').isVisible()) seen.add('detectar');
    if (await page.locator('.blank').isVisible()) seen.add('hueco');
    await page.locator('.exercise-area button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  expect([...seen].sort()).toEqual(['detectar', 'hueco']);
});
