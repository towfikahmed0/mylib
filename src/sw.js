import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

const ADMIN_API_ORIGIN = new URL(
  import.meta.env.VITE_ADMIN_API_URL || 'https://mylib-api.softrly.com',
).origin

self.skipWaiting()
clientsClaim()

// App shell + static assets. PrecacheRoute also serves the precached index.html
// for navigation requests, so deep links work offline.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Auth traffic must never be cached.
registerRoute(
  ({ url }) =>
    url.hostname === 'identitytoolkit.googleapis.com' ||
    url.hostname === 'securetoken.googleapis.com',
  new NetworkOnly(),
)

// Trusted admin API — network first, short-lived cache as a fallback.
registerRoute(
  ({ url }) => url.origin === ADMIN_API_ORIGIN,
  new NetworkFirst({
    cacheName: 'admin-api',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
  }),
)

// Firestore — network first.
registerRoute(
  ({ url }) => url.hostname === 'firestore.googleapis.com',
  new NetworkFirst({
    cacheName: 'firestore',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 300 })],
  }),
)

// Firebase Storage images (covers, avatars) — cache first.
registerRoute(
  ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'firebase-storage',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)
