// Genera los iconos PNG a partir del SVG original usando Chromium (Playwright).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/icons/', import.meta.url));
const svg = readFileSync(dir + 'icon.svg', 'utf8');

// [nombre, tamaño, margen interior en % (los "maskable" necesitan zona segura)]
const targets = [
  ['apple-touch-icon-180.png', 180, 0],
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 12],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of targets) {
  const inner = size * (1 - (2 * pad) / 100);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#ff7a3d;display:grid;place-items:center;width:${size}px;height:${size}px">
     <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  await page.screenshot({ path: dir + name, omitBackground: false });
  console.log('✔', name);
}
await browser.close();
