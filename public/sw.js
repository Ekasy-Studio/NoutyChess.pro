const CACHE_NAME = 'noutychess-static-v2';
const CORE_ASSETS = ['/manifest.webmanifest', '/icon.svg', '/favicon.svg'];
const STATIC_DESTINATIONS = new Set(['style', 'script', 'image', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('noutychess-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca armazenar HTML de navegação nem respostas de API. Essas respostas
  // podem conter sessão, perfil, amigos, notificações ou dados administrativos.
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname.startsWith('/api/')) return;

  const explicitlyStatic = CORE_ASSETS.includes(url.pathname);
  if (!explicitlyStatic && !STATIC_DESTINATIONS.has(request.destination)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
