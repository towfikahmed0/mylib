self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('mylib-v2').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com/css2?family=Inter:opsz@14..32&display=swap',
        'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
        'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http schemes
  if (!e.request.url.startsWith('http')) return;

  // Stale-while-revalidate for everything
  e.respondWith(
    caches.open('mylib-v2').then(cache => {
      return cache.match(e.request).then(response => {
        const fetchPromise = fetch(e.request).then(networkResponse => {
          // Only cache successful same-origin or specific CDN responses to avoid CORS issues
          if (networkResponse && networkResponse.status === 200) {
              const url = new URL(e.request.url);
              if (url.origin === location.origin ||
                  url.hostname.includes('gstatic.com') ||
                  url.hostname.includes('googleapis.com') ||
                  url.hostname.includes('cloudflare.com') ||
                  url.hostname.includes('unpkg.com') ||
                  url.hostname.includes('tailwindcss.com')) {
                  cache.put(e.request, networkResponse.clone());
              }
          }
          return networkResponse;
        }).catch(err => {
            console.warn('Fetch failed for:', e.request.url, err);
        });
        return response || fetchPromise;
      });
    })
  );
});
