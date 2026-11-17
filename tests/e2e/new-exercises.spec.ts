import { expect, test } from '@playwright/test';
import { answerCurrent, waitQuestionOrResult } from './helpers';

test('nuevos ejercicios: ordenar sílabas, verdadero o falso y separar sin cortes', async ({ page }) => {
  // El repaso final mezcla todos los tipos de la unidad.
  await page.goto('./#/leccion/A1/4');
  const seen = new Set<string>();
  for (let i = 0; i < 30; i++) {
    if ((await waitQuestionOrResult(page)) === 'result') break;
    const area = page.locator('.exercise-area');
    if (await area.locator('.split-word').count()) {
      // Separar: «Comprobar» está activo aunque no se haya marcado ningún corte (palabras de una sílaba).
      seen.add('separar');
      await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
    } else if (await area.locator('.tiles').count()) {
      seen.add('ordenar');
      await expect(page.getByRole('button', { name: 'Comprobar' })).toBeDisabled();
      await answerCurrent(page);
      await expect(page.getByRole('button', { name: 'Comprobar' })).toBeEnabled();
    } else if (await page.getByRole('radio', { name: 'Verdadero' }).count()) {
      seen.add('verdadero_falso');
      // La afirmación tiene que verse (p. ej. «"camión" es una palabra aguda.»).
      await expect(area.locator('.statement')).toHaveText(/^«.+».+\.$/);
      await answerCurrent(page);
    } else await answerCurrent(page);
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  expect([...seen].sort()).toEqual(['ordenar', 'separar', 'verdadero_falso']);
});

test('corregir la palabra: se escribe con la barra de tildes', async ({ page }) => {
  // La dificultad adaptativa puede cambiar preguntas: se busca en varios repasos finales.
  let found = false;
  for (const unit of ['A4/4', 'A5/4', 'A6/4', 'A9/4', 'A4/3', 'A5/3']) {
    if (found) break;
    await page.goto(`./#/leccion/${unit}`);
    await page.reload();
    for (let i = 0; i < 30 && !found; i++) {
      if ((await waitQuestionOrResult(page)) === 'result') break;
      if ((await page.locator('.wrong-word').count()) && !(await page.locator('.listen').count())) {
        found = true;
        await expect(page.getByText('Esta palabra está mal escrita. Escríbela bien')).toBeVisible();
        await page.locator('.dictation-input').fill('xyz');
        await page.getByRole('button', { name: 'Comprobar' }).click();
        await expect(page.locator('.feedback.wrong')).toBeVisible();
        await expect(page.getByText('Respuesta correcta:')).toBeVisible();
        break;
      }
      await answerCurrent(page);
      await page.getByRole('button', { name: 'Comprobar' }).click();
      await page.getByRole('button', { name: 'Continuar' }).click();
    }
  }
  expect(found).toBe(true);
});
