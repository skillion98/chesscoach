import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/chesscoach/',
  define: {
    __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['engine/*', 'icons/*'],
      manifest: {
        name: 'Chess Coach',
        short_name: 'ChessCoach',
        description: 'Personal chess trainer: play, analyze, drill openings, and improve.',
        theme_color: '#1b1b1f',
        background_color: '#1b1b1f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/chesscoach/',
        scope: '/chesscoach/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,wasm,woff2}'],
        globIgnores: ['**/ort-wasm*', '**/kokoro-*.js'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
})
