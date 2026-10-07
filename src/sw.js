import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'


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
