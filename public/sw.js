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

// Ajouté le 22/07/2026 (notifications push, voir
// core/notifications_push.py côté backend). Le payload envoyé par
// pywebpush est un JSON {title, body, url} -- voir
// envoyer_notification_push() côté Python, format tenu volontairement
// simple et stable entre les deux côtés.
self.addEventListener("push", (event) => {
  let donnees = { title: "Djiguignè", body: "" };
  try {
    donnees = event.data.json();
  } catch (e) {
    // Payload absent ou pas du JSON valide : on affiche quand même
    // quelque chose plutôt que de silencieusement ignorer la notif.
    donnees.body = event.data ? event.data.text() : "";
  }

  event.waitUntil(
    self.registration.showNotification(donnees.title || "Djiguignè", {
      body: donnees.body || "",
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      data: { url: donnees.url || "/" },
    })
  );
});

// Clic sur la notification : ramène sur l'onglet existant si déjà
// ouvert, sinon en ouvre un nouveau -- comportement standard attendu
// par les utilisateurs, pas juste "ouvrir un nouvel onglet à chaque fois".
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
