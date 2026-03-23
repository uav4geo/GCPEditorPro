// GCP Editor Pro - Service Worker for offline support
const CACHE_NAME = 'gcp-editor-pro-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest'
];

// Install: pre-cache essential shell files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first strategy with cache fallback
// This ensures users get fresh content when online, but can still
// use the app when offline.
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. tile servers, external APIs)
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Don't cache bad responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }

        // Clone and cache the good response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // For navigation requests, fall back to index.html (SPA routing)
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
