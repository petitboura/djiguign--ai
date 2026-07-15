"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appelerApi } from "@/lib/api";
import { PleinEcran } from "@/components/PleinEcran";

// Demande de Bourama (2026-07-15) : "un icone notification juste à côté
// de mon espace et dès que tu clique, un pop up qui affiche les
// notifications puis un bouton plein écran". Consomme GET/PATCH
// /api/notifications (voir api/notifications.py) -- les lignes sont
// créées côté base par des triggers Postgres sur follows/agent_comments/
// agent_ratings, ce composant ne fait que lire et marquer comme lues.
// N'est rendu QUE si connecté (voir TopBar.tsx) : les notifications
// n'ont aucun sens pour un visiteur anonyme.

type NotificationItem = {
  id: number;
  type: "follow" | "comment" | "rating" | "categorie_manquante";
  lu: boolean;
  created_at: string | null;
  acteur_id: string;
  acteur_nom: string;
  acteur_avatar_url: string | null;
  agent_id: string | null;
  agent_nom: string | null;
  agent_icone: string | null;
};

type NotificationsReponse = {
  notifications: NotificationItem[];
  non_lues: number;
};

function tempsRelatif(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

function IconeType({ type }: { type: NotificationItem["type"] }) {
  if (type === "follow") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="10" cy="8" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.5 20c1-3.7 3.7-5.5 7.5-5.5s6.5 1.8 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 8v6M16 11h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "comment") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M4 5h16v11H8l-4 4V5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === "categorie_manquante") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h8l8 8-8 8-8-8V4Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20.1l1-6L3.4 9.9l6-.9L12 3.5Z" />
    </svg>
  );
}

function texteNotification(n: NotificationItem) {
  const nom = n.acteur_nom || "Quelqu'un";
  if (n.type === "follow") return `${nom} te suit maintenant.`;
  if (n.type === "comment") return `${nom} a commenté ${n.agent_nom ?? "ton IA"}.`;
  if (n.type === "categorie_manquante")
    return `Choisis une catégorie pour ${n.agent_nom ?? "ton IA"}.`;
  return `${nom} a noté ${n.agent_nom ?? "ton IA"}.`;
}

function lienNotification(n: NotificationItem) {
  if (n.type === "follow") return `/u/${n.acteur_id}`;
  if (n.type === "categorie_manquante" && n.agent_id) return `/dashboard/agents/${n.agent_id}/modifier`;
  if (n.agent_id) return `/agent/${n.agent_id}`;
  return null;
}

function LigneNotification({
  n,
  onOuvrir,
}: {
  n: NotificationItem;
  onOuvrir: (n: NotificationItem) => void;
}) {
  const lien = lienNotification(n);
  const contenu = (
    <div
      className={`flex items-start gap-3 px-3 py-3 transition-colors hover:bg-dj-surface-haute ${
        n.lu ? "" : "bg-dj-surface-haute/60"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet">
        <IconeType type={n.type} />
      </span>
      <div className="flex-1">
        <p className="text-sm text-dj-texte">{texteNotification(n)}</p>
        <p className="mt-0.5 text-xs text-dj-texte-muet">{tempsRelatif(n.created_at)}</p>
      </div>
      {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-dj-accent-1" />}
    </div>
  );

  if (lien) {
    return (
      <Link href={lien} onClick={() => onOuvrir(n)} className="block">
        {contenu}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onOuvrir(n)} className="block w-full text-left">
      {contenu}
    </button>
  );
}

export function NotificationsCloche() {
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [nonLues, setNonLues] = useState(0);
  const [ouverte, setOuverte] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);

  function charger() {
    appelerApi("/api/notifications?limite=20")
      .then((r: NotificationsReponse) => {
        setNotifications(r.notifications);
        setNonLues(r.non_lues);
      })
      .catch(() => setNotifications([]));
  }

  useEffect(() => {
    charger();
    // Rafraîchi toutes les 60s : suffisant pour un badge de compteur,
    // pas besoin de websocket/temps réel pour ce cas d'usage.
    const intervalle = setInterval(charger, 60000);
    return () => clearInterval(intervalle);
  }, []);

  async function marquerLue(n: NotificationItem) {
    if (n.lu) return;
    setNotifications((prev) =>
      (prev ?? []).map((x) => (x.id === n.id ? { ...x, lu: true } : x))
    );
    setNonLues((v) => Math.max(0, v - 1));
    try {
      await appelerApi(`/api/notifications/${n.id}`, { method: "PATCH" });
    } catch {
      // best-effort : le badge se resynchronisera au prochain rafraîchi
      // automatique (60s) même si ce PATCH échoue.
    }
  }

  async function toutMarquerLu() {
    setNotifications((prev) => (prev ?? []).map((x) => ({ ...x, lu: true })));
    setNonLues(0);
    try {
      await appelerApi("/api/notifications/tout-lire", { method: "POST" });
    } catch {
      // best-effort, même raisonnement que marquerLue.
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {nonLues > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dj-accent-1 px-1 text-[10px] font-bold text-[#1A0D02]">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouverte && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOuverte(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-dj-bordure bg-dj-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-2">
              <span className="text-sm font-bold text-dj-texte">Notifications</span>
              {nonLues > 0 && (
                <button
                  type="button"
                  onClick={toutMarquerLu}
                  className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications === null && (
                <p className="px-3 py-4 text-sm text-dj-texte-muet">Chargement...</p>
              )}
              {notifications?.length === 0 && (
                <p className="px-3 py-4 text-sm text-dj-texte-muet">
                  Aucune notification pour l&apos;instant.
                </p>
              )}
              {notifications?.map((n, i) => (
                <div key={n.id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
                  <LigneNotification n={n} onOuvrir={marquerLue} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setPleinEcran(true);
                setOuverte(false);
              }}
              className="block w-full border-t border-dj-bordure px-3 py-2 text-center text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              Voir en plein écran ⤢
            </button>
          </div>
        </>
      )}

      <PleinEcran
        ouvert={pleinEcran}
        onFermer={() => setPleinEcran(false)}
        titre="Notifications"
        actions={
          nonLues > 0 ? (
            <button
              type="button"
              onClick={toutMarquerLu}
              className="text-xs text-dj-accent-1 transition-colors hover:text-dj-accent-2"
            >
              Tout marquer lu
            </button>
          ) : undefined
        }
      >
        {notifications?.length === 0 && (
          <p className="px-3 py-4 text-sm text-dj-texte-muet">
            Aucune notification pour l&apos;instant.
          </p>
        )}
        {notifications?.map((n, i) => (
          <div key={n.id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
            <LigneNotification n={n} onOuvrir={marquerLue} />
          </div>
        ))}
      </PleinEcran>
    </div>
  );
}
