const CACHE_NAME = 'undefine-v2';
const STATIC_ASSETS = [
  '/',
  '/ClosedVault.png',
  '/AjarVault.png',
  '/AjarVault2.png',
  '/OpenVault.png',
  '/ShineKeyVault.png',
  '/Orange.png',
  '/OrangeLeft.png',
  '/OrangeRight.png',
  '/Red.png',
  '/RedLeft.png',
  '/RedRight.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept GET requests — let POST/PUT/DELETE pass through untouched
  if (request.method !== 'GET') return;

  // Network-first for API calls and navigation
  if (request.url.includes('/api/') || request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || Response.error()))
    );
    return;
  }

  // Cache-first for static assets (images, fonts, JS/CSS bundles)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
