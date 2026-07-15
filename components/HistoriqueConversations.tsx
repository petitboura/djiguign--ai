"use client";

import { useEffect, useState } from "react";
import { appelerApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Ajouté le 2026-07-13 (Bourama : "conversation récente par membre de la
// plateforme qui se conserve pour chaque agent utilisée, et qui se met
// dans le tableau de bord, à gauche comme toute IA en fait"). Une entrée
// par agent avec qui l'utilisateur a déjà échangé (pas par message) --
// cliquer dessus rouvre le chat de cet agent précis, déjà connecté (même
// pont de session que components/BoutonUtiliser.tsx).
//
// Repositionné le 2026-07-13 (Bourama : la colonne fixe à gauche prenait
// trop de place pour ce que c'est -- déplacé dans une bulle déclenchée par
// un bouton "Historique", dans la même rangée que les autres boutons de
// "Mon espace", voir app/dashboard/page.tsx. Ce composant ne rend donc
// pas lui-même le déclencheur de la bulle (bouton + état ouvert/fermé),
// seulement le CONTENU -- la page parente gère quand l'afficher.
//
// Refonte du 2026-07-15 (Bourama : "pas comme ceci, non un vrai
// historique... et pas dans des bulles mais séparée, peut-être ligne") :
// l'affichage compact en bulles (icône + nom seul) est remplacé par une
// vraie liste de lignes séparées par des traits, chacune avec le dernier
// message en dessous du nom -- ce que dernier_message/dernier_message_role
// exposaient déjà côté API, juste pas affiché jusqu'ici. Bouton plein
// écran ajouté, géré ICI (état local) plutôt que par le parent : la bulle
// reste courte, le plein écran affiche la liste en grand sans changer qui
// déclenche quoi.
//
// Le chat lui-même reste en Streamlit (voir PIVOT_SOCIAL.md, "ce qui ne
// change pas") : ce composant ne fait qu'afficher la LISTE des
// conversations et ouvrir la bonne, pas le contenu message par message
// (ça, c'est le rôle de faces/vues/chat.py une fois qu'on y arrive).

type Conversation = {
  agent_id: string;
  agent_nom: string;
  agent_icone: string;
  dernier_message: string;
  dernier_message_role: string;
  derniere_activite: string;
};

function tempsRelatif(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return `il y a ${jours} j`;
}

function LigneConversation({
  conv,
  onOuvrir,
}: {
  conv: Conversation;
  onOuvrir: (agentId: string) => void;
}) {
  const prefixe = conv.dernier_message_role === "user" ? "Toi : " : "";
  return (
    <button
      onClick={() => onOuvrir(conv.agent_id)}
      className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-dj-surface-haute"
    >
      <span className="mt-0.5 text-xl leading-none">{conv.agent_icone}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-bold text-dj-texte">{conv.agent_nom}</span>
          {conv.derniere_activite && (
            <span className="shrink-0 text-xs text-dj-texte-muet">
              {tempsRelatif(conv.derniere_activite)}
            </span>
          )}
        </div>
        {conv.dernier_message && (
          <p className="mt-0.5 truncate text-sm text-dj-texte-muet">
            {prefixe}
            {conv.dernier_message}
          </p>
        )}
      </div>
    </button>
  );
}

export function HistoriqueConversations() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);

  useEffect(() => {
    appelerApi("/api/historique")
      .then(setConversations)
      .catch(() => setConversations([]));
  }, []);

  async function ouvrirConversation(agentId: string) {
    const streamlitUrl = process.env.NEXT_PUBLIC_STREAMLIT_URL;
    if (!streamlitUrl) return;

    let lien = `${streamlitUrl.replace(/\/$/, "")}/?agent=${agentId}`;

    // Même pont de session que BoutonUtiliser.tsx : rouvrir une
    // conversation doit reconnecter automatiquement, sans redemander de
    // se connecter (Bourama, message précédent : "sans exception").
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      lien +=
        `&access_token=${encodeURIComponent(session.access_token)}` +
        `&refresh_token=${encodeURIComponent(session.refresh_token)}`;
    }

    window.open(lien, "_blank", "noopener,noreferrer");
  }

  if (conversations === null) {
    return <p className="px-3 py-3 text-sm text-dj-texte-muet">Chargement...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-dj-texte-muet">
        Aucune conversation pour l&apos;instant.
      </p>
    );
  }

  return (
    <>
      <div className="flex max-h-80 flex-col overflow-y-auto">
        {conversations.map((conv, i) => (
          <div key={conv.agent_id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
            <LigneConversation conv={conv} onOuvrir={ouvrirConversation} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPleinEcran(true)}
        className="mt-1 block w-full border-t border-dj-bordure px-3 py-2 text-center text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        Voir en plein écran ⤢
      </button>

      {pleinEcran && (
        <div className="fixed inset-0 z-50 flex flex-col bg-dj-fond p-5">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-display text-lg font-bold text-dj-texte">Historique</h2>
              <button
                type="button"
                onClick={() => setPleinEcran(false)}
                className="rounded-full border border-dj-bordure px-4 py-2 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                Fermer
              </button>
            </div>
            <div className="flex-1 overflow-y-auto rounded-2xl border border-dj-bordure">
              {conversations.map((conv, i) => (
                <div key={conv.agent_id} className={i > 0 ? "border-t border-dj-bordure" : ""}>
                  <LigneConversation conv={conv} onOuvrir={ouvrirConversation} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

