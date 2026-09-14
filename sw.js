const CACHE_NAME = 'registro-contable-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './js/state.js',
  './js/utils.js',
  './js/storage.js',
  './js/api.js',
  './js/charts.js',
  './js/config.js',
  './js/transactions.js',
  './js/event-handlers.js',
  './js/accounts.js',
  './js/facturas.js',
  './js/facturas-split.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

// Installation event: Pre-cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Almacenando recursos críticos en caché...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Serve cached assets, bypass database API requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache for Supabase REST API requests, WebSockets, and non-GET requests
  if (
    event.request.method !== 'GET' || 
    url.href.includes('supabase.co') || 
    url.pathname.includes('/rest/v1/')
  ) {
    return; // Fall back to network (default browser behavior)
  }

  // Cache-First strategy with Network fallback for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Dynamic update of cached fonts and CDNs in background for fresh look
          if (
            url.origin === 'https://fonts.gstatic.com' || 
            url.origin === 'https://fonts.googleapis.com'
          ) {
            fetch(event.request).then(networkResponse => {
              if (networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
              }
            }).catch(() => { /* ignore offline background fetch failure */ });
          }
          return cachedResponse;
        }

        return fetch(event.request).then(response => {
          // If response is invalid or not 200, return immediately
          if (!response || response.status !== 200) {
            return response;
          }

          // Cache local static assets dynamically or Google Font resources
          if (
            url.origin === 'https://fonts.gstatic.com' || 
            url.origin === 'https://fonts.googleapis.com' || 
            event.request.destination === 'font' || 
            event.request.destination === 'image'
          ) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        });
      })
  );
});
