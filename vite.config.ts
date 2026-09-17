import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/chesscoach/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // puzzle sets and other data: fetched once, then served from cache
            urlPattern: ({ url }) => url.pathname.includes('/data/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'chesscoach-data',
              expiration: { maxEntries: 40, maxAgeSeconds: 365 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // video thumbnails for the openings grid
            urlPattern: ({ url }) => url.hostname === 'i.ytimg.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'chesscoach-thumbs',
              expiration: { maxEntries: 60, maxAgeSeconds: 90 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
