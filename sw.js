// GCP Editor Pro - Service Worker for offline support
const CACHE_NAME = 'gcp-editor-pro-v3';

// Install: fetch the build file list and pre-cache everything
self.addEventListener('install', event => {
  event.waitUntil(
    fetch('./cache-files.json')
      .then(response => response.json())
      .then(files => {
        return caches.open(CACHE_NAME).then(cache => cache.addAll(files));
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.warn('Pre-cache failed, will cache on fetch:', err);
        self.skipWaiting();
      })
  );
});

// Activate: clean up old caches, then claim clients
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

// Helper: is this a hashed (immutable) build asset?
function isHashedAsset(url) {
  return /\.[a-f0-9]{8,20}\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|wasm)$/i.test(url);
}

// Fetch handler with two strategies:
//  - Cache-first for hashed/immutable assets (JS bundles, CSS, etc.)
//  - Network-first for everything else (index.html, manifest, etc.)
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (tile servers, external CDNs, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  if (isHashedAsset(request.url)) {
    // Cache-first: hashed filenames are immutable, no need to re-fetch
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  } else {
    // Network-first: always try fresh content, fall back to cache
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;

            // SPA routing: serve index.html for navigation requests
            if (request.mode === 'navigate') {
              return caches.match(new Request('./')).then(indexResponse => {
                return indexResponse || caches.match(new Request('./index.html'));
              });
            }

            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
  }
});
