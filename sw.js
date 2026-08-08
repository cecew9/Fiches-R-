const CACHE_NAME = 'mesfiches-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Stale-while-revalidate : sert immédiatement depuis le cache si possible,
// tout en rafraîchissant le cache en arrière-plan si une connexion est disponible.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((response) => {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => null);
      return cached || networkFetch || new Response('Hors ligne, contenu non disponible.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
