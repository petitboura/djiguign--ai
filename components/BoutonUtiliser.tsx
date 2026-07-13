"use client";

import { useState } from "react";

// Étape D.3 (pivot social) : le chat reste en Streamlit, définitivement
// (voir PIVOT_SOCIAL.md, section "Ce qui ne change pas" — Étape 4 de
// api/PLAN.md abandonnée). Ce bouton ouvre l'app Streamlit existante en
// iframe (popup), avec un bouton pour l'ouvrir en nouvel onglet à la place
// ("plein écran" = la même app Streamlit sans le cadre Next.js autour, pas
// un vrai mode plein écran embarqué — voir PIVOT_SOCIAL.md).
//
// Point de vigilance documenté dans PIVOT_SOCIAL.md, PAS ENCORE VÉRIFIÉ ici
// (pas d'accès réseau au déploiement Streamlit depuis ce sandbox) : si
// l'hébergeur Streamlit (Railway) envoie un header X-Frame-Options ou
// Content-Security-Policy: frame-ancestors, l'iframe ci-dessous restera
// blanche. Si ça arrive en conditions réelles, prochaine IA : remplacer le
// <iframe> par un simple lien "Ouvrir le chat" en nouvel onglet (supprimer
// le mode popup, garder uniquement le mode plein écran).

export function BoutonUtiliser({ agentId }: { agentId: string }) {
  const [ouvert, setOuvert] = useState(false);

  const streamlitUrl = process.env.NEXT_PUBLIC_STREAMLIT_URL;
  if (!streamlitUrl) {
    // Ne fait pas planter la page agent entière si la variable manque :
    // le reste de la page (vitrine, description, notes, commentaires)
    // doit rester utilisable même si le chat n'est pas configuré.
    return (
      <p className="text-sm text-dj-inactif">
        Chat indisponible (configuration manquante).
      </p>
    );
  }

  const lienChat = `${streamlitUrl.replace(/\/$/, "")}/?agent=${agentId}`;

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="rounded-full bg-dj-gradient px-6 py-3 text-sm font-bold text-[#1A0D02] shadow-[0_2px_14px_rgba(217,99,31,0.25)] transition-transform hover:-translate-y-0.5"
      >
        Utiliser cet agent
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-dj-fade-in">
          <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface">
            <div className="flex items-center justify-between border-b border-dj-bordure px-4 py-3">
              <span className="text-sm text-dj-texte-muet">Chat</span>
              <div className="flex items-center gap-2">
                <a
                  href={lienChat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  Plein écran
                </a>
                <button
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer"
                  className="rounded-full border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte transition-colors hover:border-dj-bordure-forte"
                >
                  Fermer
                </button>
              </div>
            </div>
            <iframe
              src={lienChat}
              title="Chat avec l'agent"
              className="flex-1 border-0 bg-dj-fond"
            />
          </div>
        </div>
      )}
    </>
  );
}
