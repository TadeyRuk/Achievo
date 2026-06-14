// Bump this version any time you deploy new JS/CSS bundles to force
// the old stale cache to be evicted on all clients (fixes blank screen on mobile).
const CACHE_NAME = 'achievo-cache-v6';

self.addEventListener('install', () => {
  // Take control immediately without waiting for old SW to finish.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete ALL caches from previous versions.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests. Let API, Stellar, and horizon pass through.
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('stellar') ||
    event.request.url.includes('horizon') ||
    event.request.url.includes('fonts.googleapis') ||
    event.request.url.includes('fonts.gstatic')
  ) {
    return;
  }

  // Network-First for EVERYTHING (navigations + JS/CSS/images).
  // This guarantees fresh JS chunks after a new deploy, preventing blank screens.
  // Falls back to the cache only when truly offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/')))
  );
});
