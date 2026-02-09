const CACHE_NAME = 'salespro-v4';
const STATIC_CACHE = 'salespro-static-v4';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install — precache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME && n !== STATIC_CACHE).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SPA navigation — network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html')).then(r => r || caches.match('/index.html'))
    );
    return;
  }

  // Skip external APIs
  if (url.hostname.includes('google') || url.hostname.includes('supabase') || url.hostname.includes('telegram') || url.hostname.includes('airtable')) {
    return;
  }

  // Static assets — stale-while-revalidate
  if (event.request.method === 'GET' && (url.origin === self.location.origin || url.hostname.includes('cdn'))) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          const fetched = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);

          return cached || fetched;
        })
      )
    );
    return;
  }
});
