"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { appelerApi } from "@/lib/api";

// Étape D.3 (pivot social). Contrat backend (api/agents.py) :
// GET .../comments est public et renvoie une liste brute (pas d'enveloppe
// de pagination, contrairement à /api/feed) ; POST exige un token.
// user_id est renvoyé par commentaire mais le backend ne résout pas encore
// le nom affiché (pas de jointure vers profiles ici, voir la note sur
// obtenir_agent_public dans api/agents.py qui applique le même principe) —
// donc on affiche l'id tronqué en attendant que /api/profiles existe côté
// UI (Étape D.4). Pas idéal, mais pas de fausse donnée inventée.

type Commentaire = {
  id: string;
  agent_id: string;
  user_id: string;
  contenu: string;
  created_at?: string | null;
};

export function CommentairesAgent({ agentId }: { agentId: string }) {
  const [commentaires, setCommentaires] = useState<Commentaire[] | null>(null);
  const [connecte, setConnecte] = useState<boolean | undefined>(undefined);
  const [brouillon, setBrouillon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function charger() {
    appelerApi(`/api/agents/${agentId}/comments`)
      .then((r: Commentaire[]) => setCommentaires(r))
      .catch(() => setCommentaires([]));
  }

  useEffect(() => {
    charger();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setConnecte(!!session);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const contenu = brouillon.trim();
    if (!contenu) return;

    setEnvoi(true);
    setErreur(null);
    try {
      await appelerApi(`/api/agents/${agentId}/comments`, {
        method: "POST",
        body: JSON.stringify({ contenu }),
      });
      setBrouillon("");
      charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {connecte && (
        <form onSubmit={envoyer} className="flex flex-col gap-2">
          <textarea
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            placeholder="Écrire un commentaire..."
            rows={2}
            className="rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte placeholder:text-dj-inactif focus:border-dj-bordure-forte focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={envoi || !brouillon.trim()}
              className="self-start rounded-full bg-dj-gradient px-4 py-2 text-xs font-bold text-[#1A0D02] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publier
            </button>
            {erreur && <p className="text-xs text-dj-accent-2">{erreur}</p>}
          </div>
        </form>
      )}
      {connecte === false && (
        <p className="text-sm text-dj-texte-muet">
          Connecte-toi pour commenter.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {commentaires === null && (
          <p className="text-sm text-dj-texte-muet">Chargement...</p>
        )}
        {commentaires?.length === 0 && (
          <p className="text-sm text-dj-texte-muet">Aucun commentaire pour l'instant.</p>
        )}
        {commentaires?.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3"
          >
            <p className="text-xs text-dj-texte-muet">{c.user_id.slice(0, 8)}</p>
            <p className="mt-1 text-sm text-dj-texte">{c.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
