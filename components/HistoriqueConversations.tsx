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
// plus lui-même le déclencheur (bouton + état ouvert/fermé), seulement le
// CONTENU de la bulle -- la page parente gère quand l'afficher, exactement
// comme le fait déjà la bulle "Modifier un agent" juste à côté.
// Affichage compacté en bulles (icône + nom) : le dernier message et
// l'horodatage, utiles dans une colonne large, deviennent superflus dans
// une bulle étroite -- retirés pour rester lisible.
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

export function HistoriqueConversations() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

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
    return <p className="px-1 text-sm text-dj-texte-muet">Chargement...</p>;
  }

  if (conversations.length === 0) {
    return (
      <p className="px-1 text-sm text-dj-texte-muet">
        Aucune conversation pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto p-1">
      {conversations.map((conv) => (
        <button
          key={conv.agent_id}
          onClick={() => ouvrirConversation(conv.agent_id)}
          title={conv.agent_nom}
          className="flex items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-surface-haute px-3 py-1.5 text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
        >
          <span className="text-base leading-none">{conv.agent_icone}</span>
          <span className="max-w-[9rem] truncate">{conv.agent_nom}</span>
        </button>
      ))}
    </div>
  );
}
