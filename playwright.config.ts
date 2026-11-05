import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas E2E con emulación de iPhone.
 * - En CI (GitHub Actions) se usa el motor WebKit, el de Safari.
 * - En local, si WebKit no está instalado, PW_BROWSER=chromium usa Chromium con la misma emulación.
 */
const browser = (process.env.PW_BROWSER ?? 'webkit') as 'webkit' | 'chromium';
const iphone = devices['iPhone 13'];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/ortografia/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: `iphone-${browser}`,
      use: {
        ...iphone,
        browserName: browser,
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
        serviceWorkers: 'allow',
      },
    },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/ortografia/',
    reuseExistingServer: !process.env.CI,
  },
});
