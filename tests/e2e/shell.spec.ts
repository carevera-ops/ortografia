import { expect, test } from '@playwright/test';

test('carga el inicio y navega con la barra de pestañas', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await page.getByRole('link', { name: 'Camino' }).click();
  await expect(page.getByRole('heading', { name: 'Tu camino' })).toBeVisible();
  await expect(page.getByText('Tilde en las agudas')).toBeVisible();
  await page.getByRole('link', { name: 'Teoría' }).click();
  await expect(page.getByRole('heading', { name: 'Teoría' })).toBeVisible();
});

test('el manifest y las etiquetas de Apple están presentes', async ({ page, request }) => {
  await page.goto('./');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-touch-icon-180\.png$/);
  const res = await request.get('manifest.webmanifest');
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/ortografia/');
  expect(manifest.scope).toBe('/ortografia/');
});

test('funciona sin conexión tras la primera carga', async ({ page, context }) => {
  await page.goto('./');
  // Esperamos a que el service worker se active (precarga terminada).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // En la primera visita el SW no controla la página: tras recargar, sí.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
  await page.getByRole('link', { name: 'Camino' }).click();
  await expect(page.getByText('Las sílabas')).toBeVisible();
  // Los iconos también salen de la caché.
  const iconOk = await page.evaluate(async () => (await fetch('icons/icon-192.png')).ok);
  expect(iconOk).toBe(true);
  await context.setOffline(false);
});

test('en Safari sin instalar muestra la ayuda de instalación', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => false, configurable: true });
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: '¡Instala Tildín en tu iPhone!' })).toBeVisible();
  await page.getByRole('button', { name: 'Probar en Safari de todas formas' }).click();
  await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible();
});
