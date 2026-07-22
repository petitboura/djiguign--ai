"use client";

import { useCallback, useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";

// Extrait le 22/07/2026 de components/NotificationsPushToggle.tsx pour
// être partagé avec components/NotificationsPushCloche.tsx (bouton
// compact dans la TopBar, demande de Bourama : "devrait être
// directement à côté du bouton mon espace ... et disparaît après
// activation").

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(base64);
  const tableau = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  return tableau;
}

export type EtatNotificationsPush =
  | "verification"
  | "indisponible"
  | "service_worker_bloque"
  | "refuse"
  | "inactif"
  | "actif"
  | "changement";

export function useNotificationsPush() {
  const [etat, setEtat] = useState<EtatNotificationsPush>("verification");
  const [erreur, setErreur] = useState<string | null>(null);

  const verifierEtat = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEtat("indisponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    try {
      // Voir NotificationsPushToggle.tsx (historique du bug) : timeout
      // de sécurité, navigator.serviceWorker.ready peut ne jamais se
      // résoudre si l'enregistrement du service worker échoue/traîne.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      const abonnementExistant = await registration.pushManager.getSubscription();
      setEtat(abonnementExistant ? "actif" : "inactif");
    } catch {
      setEtat("service_worker_bloque");
    }
  }, []);

  useEffect(() => {
    verifierEtat();
  }, [verifierEtat]);

  const activer = useCallback(async () => {
    setErreur(null);
    setEtat("changement");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return false;
      }

      const { cle_publique } = await appelerApi("/api/notifications-push/cle-publique");
      const registration = await navigator.serviceWorker.ready;
      const abonnement = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cle_publique),
      });

      await appelerApi("/api/notifications-push/abonnement", {
        method: "POST",
        body: JSON.stringify(abonnement.toJSON()),
      });

      setEtat("actif");
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEtat("inactif");
      return false;
    }
  }, []);

  const desactiver = useCallback(async () => {
    setErreur(null);
    setEtat("changement");
    try {
      const registration = await navigator.serviceWorker.ready;
      const abonnement = await registration.pushManager.getSubscription();
      if (abonnement) {
        await appelerApi("/api/notifications-push/desabonnement", {
          method: "POST",
          body: JSON.stringify({ endpoint: abonnement.endpoint }),
        });
        await abonnement.unsubscribe();
      }
      setEtat("inactif");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEtat("actif");
    }
  }, []);

  return { etat, erreur, activer, desactiver, verifierEtat };
}

// Déclenchement automatique sur la toute première action réelle (envoi
// de message, création d'IA...) -- demande explicite de Bourama
// (2026-07-22) : "dès que tu ouvre, permission demandé ... comme
// utiliser une ia, ou appui sur créer son IA". Un seul essai automatique
// EVER par appareil (pas par session) : redemander à chaque message si
// la personne a ignoré la popup native serait très intrusif. Le bouton
// cloche/profil reste toujours disponible pour réessayer manuellement
// ensuite, quel que soit ce flag.
const CLE_DEJA_PROPOSE = "djiguigne_notif_push_proposee";

export function proposerNotificationsPushUneFois(activer: () => Promise<boolean>) {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(CLE_DEJA_PROPOSE)) return;
  if (Notification.permission !== "default") return; // déjà répondu avant
  window.localStorage.setItem(CLE_DEJA_PROPOSE, "true");
  activer();
}
