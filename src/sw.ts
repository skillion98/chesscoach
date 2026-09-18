/// <reference lib="webworker" />
// Custom service worker: precache the app, cache data/audio/model files at runtime, and add the
// COOP/COEP headers that make the page cross-origin isolated so WebAssembly can use threads
// (GitHub Pages cannot send those headers itself).

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precache } from 'workbox-precaching'
import { CacheFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

self.skipWaiting()
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precache(self.__WB_MANIFEST)

const scopePath = new URL(self.registration.scope).pathname
const navHandler = createHandlerBoundToURL(scopePath + 'index.html')

const dataCache = new CacheFirst({
  cacheName: 'chesscoach-data',
  plugins: [new ExpirationPlugin({ maxEntries: 800, maxAgeSeconds: 365 * 24 * 3600 }), new CacheableResponsePlugin({ statuses: [0, 200] })],
})

function isDataRequest(url: URL): boolean {
  return (
    url.pathname.includes('/data/') ||
    url.pathname.includes('/audio/') ||
    /ort-wasm|kokoro-/.test(url.pathname) ||
    url.hostname === 'huggingface.co' ||
    url.hostname.endsWith('hf.co')
  )
}

function withIsolation(res: Response): Response {
  if (res.status === 0 || res.type === 'opaque') return res
  const headers = new Headers(res.headers)
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin
  event.respondWith(
    (async () => {
      let res: Response | undefined
      if (sameOrigin && req.mode === 'navigate') {
        try {
          res = await navHandler({ event, request: req, url })
        } catch {
          res = await fetch(req)
        }
      } else if (sameOrigin) {
        res = await matchPrecache(req)
      }
      if (!res && isDataRequest(url)) {
        try {
          res = await dataCache.handle({ event, request: req })
        } catch {
          res = undefined
        }
      }
      if (!res) res = await fetch(req)
      return sameOrigin ? withIsolation(res) : res
    })(),
  )
})
