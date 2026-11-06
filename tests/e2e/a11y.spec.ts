import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Revisión automática de accesibilidad (WCAG 2.1 A/AA) de las pantallas principales. */
const SCREENS = ['#/', '#/camino', '#/progreso', '#/teoria', '#/teoria/agudas', '#/acerca', '#/padres', '#/leccion/A4/1', '#/seguimiento'];

for (const hash of SCREENS) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`accesibilidad ${hash} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`./${hash}`);
      await page.waitForTimeout(600);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
      expect(summary).toEqual([]);
    });
  }
}

test('accesibilidad del feedback de la lección (claro y oscuro)', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`./#/leccion/${scheme === 'light' ? 'A11/2' : 'B6/2'}`);
    await page.locator('.exercise-area button:not([disabled])').first().click();
    await page.getByRole('button', { name: 'Comprobar' }).click();
    await expect(page.locator('.feedback')).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  }
});
