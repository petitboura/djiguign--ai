"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Échec silencieux : le site marche très bien sans service
        // worker, il perd juste l'installabilité PWA. Pas la peine
        // d'embêter la personne avec ça.
      });
    }
  }, []);

  return null;
}
