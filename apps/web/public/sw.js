// WLEDashboard Service Worker for PWA Standalone App & WebAPK Minting
const CACHE_NAME = 'wledashboard-v2'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
]

// 1. Install: Precache core shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache partial error:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// 2. Activate: Clean up previous cache versions and take control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Fetch: Strict network-only for real-time APIs/WebSockets, safe fallback for shell
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') {
    return
  }

  const url = new URL(event.request.url)

  // Only handle same-origin requests; never intercept cross-origin (e.g. CDNs, Google Fonts)
  if (url.origin !== self.location.origin) {
    return
  }

  // Bypass service worker completely for API routes, WebSockets, or Vite dev paths
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src') ||
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return
  }

  // Navigation requests: Network-first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html')
        return cached || fetch(event.request)
      })
    )
    return
  }

  // Static assets: Stale-while-revalidate with safe pass-through
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          }).catch(() => {})
        }
        return networkResponse
      }).catch((err) => {
        if (cachedResponse) return cachedResponse
        throw err
      })

      return cachedResponse || fetchPromise
    })
  )
})
