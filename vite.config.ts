import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import paket from './package.json' with { type: 'json' }

// base './' → läuft unter jedem Pfad (GitHub Pages: /<repo>/)
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(paket.version) },
  base: './',
  build: {
    // jsPDF lädt diese Pakete nur für HTML-Export, den die App nicht nutzt
    rollupOptions: { external: ['html2canvas', 'dompurify', 'canvg'] },
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Holzbau-Spicker',
        short_name: 'Holzbau',
        description: 'Rechnungen und Maßkontrollen für Zimmerer – offline auf der Baustelle.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f4f1ea',
        theme_color: '#2f5d3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
