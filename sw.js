const CACHE_VERSION = 'mylib-v2';  // bumped to force reinstall of the broken v1
const PRECACHE_URLS = [
  '/',
  '/index.html'
  // Note: CDN assets are NOT precached — cache.addAll is atomic, and one
  // CORS-blocked CDN fetch kills the entire install. They're cached lazily
  // on first runtime fetch below instead.
];

// Hosts that must NEVER be cached. Substring-matched on the hostname.
const NEVER_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaselogging.googleapis.com',
  'firebaselogging-pa.googleapis.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'google-analytics.com',
  'googletagmanager.com'
];

// Hosts whose responses ARE safe to cache (assets only, no PII, no auth).
const CACHEABLE_HOSTS = [
  'gstatic.com',
  'cloudflare.com',
  'unpkg.com',
  'tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'jsdelivr.net'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept APIs, auth, tokens, or telemetry. Pass straight to network.
  if (NEVER_CACHE_HOSTS.some(h => url.hostname.endsWith(h))) return;

  e.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(e.request).then(cached => {
        const networkFetch = fetch(e.request)
          .then(res => {
            // Only cache if successful, not opaque, and on our allowlist.
            if (res && res.status === 200 && res.type !== 'opaque') {
              const cacheable =
                url.origin === location.origin ||
                CACHEABLE_HOSTS.some(h => url.hostname.endsWith(h));
              if (cacheable) cache.put(e.request, res.clone());
            }
            return res;
          })
          .catch(err => {
            console.warn('[SW] fetch failed:', e.request.url, err);
            if (cached) return cached;
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });

        // Stale-while-revalidate: serve cache immediately, refresh in background.
        return cached || networkFetch;
      })
    )
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});