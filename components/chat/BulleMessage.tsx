"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, RotateCw, Pencil, Volume2, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { formaterHeure } from "@/lib/formatageHeure";

export interface MessageAffiche {
  id: number | null; // id historique_conversations (null tant que non persisté, ex: pendant le streaming)
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// Voir MIGRATION_CHAT_VERS_NEXTJS.md, section 3.1 :
// - heure affichée sous le message UTILISATEUR uniquement
// - boutons différents selon le rôle
export function BulleMessage({
  message,
  onRegenerer,
  onEditer,
  onLike,
  onDislike,
}: {
  message: MessageAffiche;
  onRegenerer?: () => void;
  onEditer?: (nouveauTexte: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
}) {
  const [copie, setCopie] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const [texteEdition, setTexteEdition] = useState(message.content);
  const estUtilisateur = message.role === "user";

  function copier() {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  // Boutons pas encore branchés (voir section 4 du récap) : comportement
  // placeholder, jamais silencieux -- l'utilisateur sait que ça arrive.
  function pasDisponible() {
    alert("Pas disponible pour le moment.");
  }

  if (enEdition) {
    return (
      <div className="ml-auto max-w-[80%] rounded-2xl bg-dj-surface-haute p-3">
        <textarea
          value={texteEdition}
          onChange={(e) => setTexteEdition(e.target.value)}
          className="w-full resize-none rounded-lg bg-transparent text-sm text-dj-texte outline-none"
          rows={3}
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2 text-xs">
          <button
            onClick={() => setEnEdition(false)}
            className="rounded-md px-3 py-1.5 text-dj-texte-muet hover:text-dj-texte"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              setEnEdition(false);
              onEditer?.(texteEdition);
            }}
            className="rounded-md bg-dj-gradient px-3 py-1.5 font-semibold text-[#1A0D02]"
          >
            Renvoyer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex flex-col ${estUtilisateur ? "items-end" : "items-start"}`}>
      <div
        className={
          estUtilisateur
            ? "max-w-[80%] rounded-2xl bg-dj-surface-haute px-4 py-2.5 text-[15px] text-dj-texte"
            : "max-w-[80%] px-1 py-1 text-[15px] leading-relaxed text-dj-texte"
        }
      >
        {/* Rendu Markdown unique et cohérent (gras/liens/tableaux/listes en
            une seule fois) -- voir MIGRATION_CHAT_VERS_NEXTJS.md 1.1 : ceci
            règle définitivement le bug hérité de Streamlit (bloc HTML brut
            qui empêchait toute transformation Markdown). Couleur des liens
            fixée sur l'accent de la charte, jamais bleu (voir 1.2). */}
        <div className="dj-markdown [&_a]:text-dj-accent-1 [&_a]:underline [&_a:hover]:text-dj-accent-2 [&_table]:my-2 [&_td]:border [&_td]:border-dj-bordure [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-dj-bordure [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
      </div>

      {/* Heure : uniquement sous le message utilisateur (correction du
          2026-07-15 -- pas sous l'assistant, voir section 3.1). */}
      {estUtilisateur && message.created_at && (
        <span className="mt-1 text-[11px] text-dj-inactif">{formaterHeure(message.created_at)}</span>
      )}

      <div className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={copier} aria-label="Copier" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
          {copie ? <Check size={14} /> : <Copy size={14} />}
        </button>

        {estUtilisateur ? (
          <>
            <button onClick={onRegenerer} aria-label="Renvoyer" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <RotateCw size={14} />
            </button>
            <button
              onClick={() => setEnEdition(true)}
              aria-label="Éditer"
              className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte"
            >
              <Pencil size={14} />
            </button>
          </>
        ) : (
          <>
            <button onClick={pasDisponible} aria-label="Lire à voix haute" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <Volume2 size={14} />
            </button>
            <button onClick={onLike} aria-label="Retour positif" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <ThumbsUp size={14} />
            </button>
            <button onClick={onDislike} aria-label="Retour négatif" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <ThumbsDown size={14} />
            </button>
            <button onClick={onRegenerer} aria-label="Régénérer" className="rounded-md p-1.5 text-dj-texte-muet hover:text-dj-texte">
              <RotateCw size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
