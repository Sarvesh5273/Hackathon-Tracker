const STATIC_CACHE = 'hackos-static-v1';
const API_CACHE = 'hackos-api-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => {
        if (k !== STATIC_CACHE && k !== API_CACHE) return caches.delete(k);
        return null;
      })
    ))
  );
  self.clients.claim();
});

function timeoutPromise(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((res) => {
      clearTimeout(id);
      resolve(res);
    }, (err) => {
      clearTimeout(id);
      reject(err);
    });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      try {
        const networkResponse = await timeoutPromise(fetch(request), 5000);
        const cloned = networkResponse.clone();
        const cache = await caches.open(API_CACHE);
        cache.put(request, cloned);
        return networkResponse;
      } catch (err) {
        // Try cached
        const cached = await caches.match(request);
        if (cached) return cached;
        // For the hackathons list, also try the canonical key
        if (url.pathname === '/api/hackathons') {
          const apiCache = await caches.open(API_CACHE);
          const keys = await apiCache.keys();
          const match = keys.find((k) => k.url.endsWith('/api/hackathons'));
          if (match) return apiCache.match(match);
        }
        return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // Cache-first for static assets (scripts, styles, images)
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg')) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // Fallback to index for navigations
        const nav = await caches.match('/index.html');
        return nav || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Navigation requests - serve index.html from cache
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('/index.html');
      if (cached) return cached;
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(STATIC_CACHE);
        cache.put('/index.html', networkResponse.clone());
        return networkResponse;
      } catch (err) {
        return new Response('<html><body>Offline</body></html>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Default: try network then cache
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch (err) {
      const cached = await caches.match(request);
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});
