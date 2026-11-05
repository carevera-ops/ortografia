/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Ruta en GitHub Pages: https://<usuario>.github.io/ortografia/
// Se puede cambiar con la variable BASE_PATH si el repositorio cambia de nombre.
const base = process.env.BASE_PATH ?? '/ortografia/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // "prompt": el usuario decide cuándo actualizar (aviso "Hay una versión nueva").
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'icons/*.svg', 'favicon.svg'],
      manifest: {
        id: base,
        name: 'Tildín · Ortografía',
        short_name: 'Tildín',
        description: 'Aprende ortografía y acentuación jugando.',
        lang: 'es-ES',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fff8ef',
        theme_color: '#ff7a3d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precarga de TODO: código, contenido JSON, iconos e ilustraciones.
        globPatterns: ['**/*.{js,css,html,json,png,svg,webmanifest,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    // Zona horaria fija para los tests de fechas (cambio de hora incluido).
    env: { TZ: 'Europe/Madrid' },
    include: ['tests/unit/**/*.test.ts'],
  },
});
