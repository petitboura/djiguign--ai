const CACHE = "djiguigne-v1";

// Volontairement minimal : juste assez pour que les navigateurs
// considèrent le site "installable" (condition technique : un service
// worker actif avec un handler fetch). Pas de stratégie de cache
// agressive pour l'instant -- réseau en priorité, cache en secours si
// hors ligne, pour ne jamais servir une version périmée de l'app par
// erreur.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() => caches.match(event.request))
  );
});
