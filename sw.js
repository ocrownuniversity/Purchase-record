// ── PurchaseLog Service Worker ──
// Cache-first strategy for all app assets, network-first for external fonts.

const CACHE_NAME = 'purchaselog-v1';
const OFFLINE_URL = './index.html';

// Assets to pre-cache on install
const PRE_CACHE = [
  './index.html',
  './manifest.json'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For Google Fonts — network first, fall back to cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For same-origin requests — cache first, fall back to network, then offline page
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            // Cache successful GET responses
            if (event.request.method === 'GET' && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
    );
    return;
  }
});

// ── BACKGROUND SYNC (future-ready) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-records') {
    // Placeholder for future backend sync
    console.log('[SW] Background sync triggered:', event.tag);
  }
});

// ── PUSH NOTIFICATIONS (future-ready) ──
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title || 'PurchaseLog', {
      body: data.body || 'You have a new notification.',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png'
    });
  }
});
