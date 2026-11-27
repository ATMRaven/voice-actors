const CACHE_NAME = 'voice-actors-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/mobile.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/js/db.js',
  '/js/favorites.js',
  '/js/filename.js',
  '/js/keys.js',
  '/js/palette.js',
  '/js/vault.js',
  '/modules/back-navigation.js',
  '/modules/UpdateManager.js',
  '/components/DownloadApp.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') || url.pathname === '/latest.json') {
    return;
  }

  if (url.pathname.startsWith('/previews/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (e) {
          return cached;
        }
      })
    );
    return;
  }

  const isCodeOrStyle = url.origin === self.location.origin && /\.(js|css|html)$/.test(url.pathname);
  if (event.request.mode === 'navigate' || isCodeOrStyle) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request).then((hit) => hit || (event.request.mode === 'navigate' ? caches.match('/offline.html') : undefined)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
