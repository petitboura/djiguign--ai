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

function formaterActivite(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const diffHeures = diffMs / (1000 * 60 * 60);
  if (diffHeures < 1) return "à l'instant";
  if (diffHeures < 24) return `il y a ${Math.floor(diffHeures)} h`;
  const diffJours = Math.floor(diffHeures / 24);
  if (diffJours < 7) return `il y a ${diffJours} j`;
  return new Date(dateIso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

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

  return (
    <aside className="w-full shrink-0 md:w-64">
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">
        Conversations
      </h2>

      {conversations === null && (
        <p className="px-1 text-sm text-dj-texte-muet">Chargement...</p>
      )}

      {conversations?.length === 0 && (
        <p className="px-1 text-sm text-dj-texte-muet">
          Aucune conversation pour l&apos;instant.
        </p>
      )}

      <div className="flex flex-col gap-1">
        {conversations?.map((conv) => (
          <button
            key={conv.agent_id}
            onClick={() => ouvrirConversation(conv.agent_id)}
            className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-dj-surface-haute"
          >
            <span className="text-lg leading-none">{conv.agent_icone}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-dj-texte">
                {conv.agent_nom}
              </span>
              <span className="block truncate text-xs text-dj-texte-muet">
                {conv.dernier_message_role === "user" ? "Toi : " : ""}
                {conv.dernier_message}
              </span>
            </span>
            <span className="shrink-0 text-[10px] text-dj-texte-muet">
              {formaterActivite(conv.derniere_activite)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
