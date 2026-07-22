"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";

// Ajouté le 22/07/2026 (notifications push, voir
// core/notifications_push.py + api/notifications_push.py côté
// backend). Volontairement un bouton explicite dans les paramètres,
// PAS une demande de permission automatique au chargement de l'app --
// les navigateurs pénalisent (et les gens détestent) les popups de
// permission non sollicitées dès l'arrivée sur un site.

// Conversion standard base64url -> Uint8Array, requise par
// pushManager.subscribe({applicationServerKey}) qui n'accepte pas une
// simple chaîne. Fonction largement documentée pour l'API Push, pas
// une invention maison.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(base64);
  const tableau = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  return tableau;
}

type Etat = "verification" | "indisponible" | "refuse" | "inactif" | "actif" | "changement";

export function NotificationsPushToggle() {
  const [etat, setEtat] = useState<Etat>("verification");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    verifierEtat();
  }, []);

  async function verifierEtat() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEtat("indisponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const abonnementExistant = await registration.pushManager.getSubscription();
      setEtat(abonnementExistant ? "actif" : "inactif");
    } catch {
      setEtat("inactif");
    }
  }

  async function activer() {
    setErreur(null);
    setEtat("changement");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
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
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
      setEtat("inactif");
    }
  }

  async function desactiver() {
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
  }

  if (etat === "verification") return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-6">
      <h2 className="font-display text-base font-bold text-dj-texte">Notifications push</h2>

      {etat === "indisponible" && (
        <p className="text-sm text-dj-texte-muet">
          Ton navigateur ne supporte pas les notifications push.
        </p>
      )}

      {etat === "refuse" && (
        <p className="text-sm text-dj-texte-muet">
          Les notifications sont bloquées pour ce site. Autorise-les dans les paramètres de ton
          navigateur pour les activer ici.
        </p>
      )}

      {(etat === "inactif" || etat === "changement") && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dj-texte-muet">
            Reçois un rappel ou une alerte directement sur cet appareil, même quand Djiguignè
            n'est pas ouvert.
          </p>
          <button
            type="button"
            onClick={activer}
            disabled={etat === "changement"}
            className="shrink-0 rounded-full bg-dj-gradient px-4 py-2 text-sm font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {etat === "changement" ? "…" : "Activer"}
          </button>
        </div>
      )}

      {etat === "actif" && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-dj-texte-muet">Notifications activées sur cet appareil.</p>
          <button
            type="button"
            onClick={desactiver}
            className="shrink-0 text-sm text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            Désactiver
          </button>
        </div>
      )}

      {erreur && <p className="text-sm text-[#F87171]">{erreur}</p>}
    </section>
  );
}
