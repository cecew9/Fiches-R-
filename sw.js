const CACHE_NAME = 'mesfiches-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['./', './index.html']).catch(() => {});
    })
  );
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
// Si rien n'est en cache et que le réseau échoue, on renvoie toujours une vraie
// réponse de secours (jamais null, sinon Safari affiche une erreur fatale).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(handleFetch(e.request));
});

async function handleFetch(request) {
  let cached;
  try {
    cached = await caches.match(request);
  } catch (err) {
    cached = undefined;
  }

  const networkFetch = fetch(request).then(async (response) => {
    if (response && response.status === 200) {
      try {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      } catch (err) {}
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // On renvoie le cache tout de suite, et on laisse la mise à jour se faire
    // en arrière-plan sans bloquer ni faire planter la requête.
    networkFetch.catch(() => {});
    return cached;
  }

  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;

  return new Response('Hors ligne, contenu non disponible.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}
