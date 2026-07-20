"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import { Copy, RotateCw, Pencil, Volume2, ThumbsUp, ThumbsDown, Check, MessageSquareQuote } from "lucide-react";
import { formaterHeure } from "@/lib/formatageHeure";

// Le modèle mélange parfois du HTML brut dans son Markdown (le plus
// courant : "<br>" pour forcer un retour à la ligne dans une liste ou une
// cellule de tableau -- signalé par Bourama, ça s'affichait juste comme
// du texte littéral "<br>-"). Sans plugin dédié, remark/react-markdown
// n'interprète JAMAIS le HTML brut du Markdown source : il l'échappe et
// l'affiche tel quel, par sécurité. rehype-raw le fait redevenir de
// vraies balises ; rehype-sanitize passe juste derrière pour retirer tout
// ce qui serait dangereux (<script>, attributs on*...) si jamais le
// modèle en générait -- le schéma par défaut (celui de GitHub) autorise
// déjà <br>, les tableaux, listes, etc.

// Le modèle (GPT-OSS/Groq) écrit ses formules avec les délimiteurs
// \( \) et \[ \] (convention OpenAI-like). Mais en Markdown (CommonMark,
// ce que suit remark), un backslash suivi de ponctuation ( \( \) \[ \] )
// est traité comme un caractère ÉCHAPPÉ : le backslash est supprimé AVANT
// même que remark-math ne voie le texte, ce qui laisse des crochets/
// parenthèses nus et casse tout rendu LaTeX (même bug que dans l'ancien
// chat.py Streamlit, voir _normaliser_latex -- même cause, même remède,
// juste porté ici côté JS). On convertit donc systématiquement vers les
// délimiteurs $ $ / $$ $$, que remark-math sait consommer directement et
// que CommonMark ne touche pas (le $ n'a pas de sens spécial pour lui).
function normaliserLatex(texte: string): string {
  return texte
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formule) => `$$${formule}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formule) => `$${formule}$`);
}

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
  onExpliquerSelection,
}: {
  message: MessageAffiche;
  onRegenerer?: () => void;
  onEditer?: (nouveauTexte: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
  onExpliquerSelection?: (texteSelectionne: string) => void;
}) {
  const [copie, setCopie] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const [texteEdition, setTexteEdition] = useState(message.content);
  const estUtilisateur = message.role === "user";

  // Sélection de texte -> "expliquer ce passage" (2026-07-20). Signal
  // utilisateur non textuel : on capte la sélection native du navigateur
  // dans la bulle assistant, pas un nouveau composant de sélection custom.
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ texte: string; x: number; y: number } | null>(null);

  function gererFinSelection() {
    if (!onExpliquerSelection || estUtilisateur) return;
    const sel = window.getSelection();
    const texte = sel?.toString().trim();
    if (!sel || !texte || sel.rangeCount === 0 || !conteneurRef.current?.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ texte, x: rect.left + rect.width / 2, y: rect.top });
  }

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
        <div
          ref={conteneurRef}
          onMouseUp={gererFinSelection}
          className="dj-markdown [&_a]:text-dj-accent-1 [&_a]:underline [&_a:hover]:text-dj-accent-2 [&_table]:my-2 [&_td]:border [&_td]:border-dj-bordure [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-dj-bordure [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 last:[&_p]:mb-0 [&_h1]:font-display [&_h1]:font-bold [&_h1]:tracking-[-0.01em] [&_h1]:text-dj-texte [&_h1]:text-xl [&_h1]:mb-2 [&_h1]:mt-3 [&_h2]:font-display [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2]:text-dj-texte [&_h2]:text-lg [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:font-display [&_h3]:font-bold [&_h3]:tracking-[-0.01em] [&_h3]:text-dj-texte [&_h3]:text-base [&_h3]:mb-1.5 [&_h3]:mt-2"
        >
          {/* remarkGfm (tableaux/gras/liens) + remarkMath/rehypeKatex
              (LaTeX) tournent dans LA MÊME passe de parsing -- c'est ça
              qui évite le jeu de whack-a-mole où corriger le gras/les
              tableaux à la main cassait le LaTeX (ou l'inverse) : un seul
              moteur, cohérent, jamais de manipulation du texte brut à
              part la normalisation des délimiteurs ci-dessus. */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, defaultSchema], rehypeKatex]}
          >
            {normaliserLatex(message.content)}
          </ReactMarkdown>
        </div>

        {/* Bulle flottante "Expliquer" -- apparaît uniquement sur une
            sélection de texte dans une réponse assistant. position:fixed,
            calée sur la sélection native du navigateur. */}
        {selection && (
          <button
            onClick={() => {
              onExpliquerSelection?.(selection.texte);
              setSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            style={{ left: selection.x, top: selection.y - 40 }}
            className="fixed z-20 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-dj-gradient px-3 py-1.5 text-xs font-semibold text-[#1A0D02] shadow-lg"
          >
            <MessageSquareQuote size={13} />
            Expliquer
          </button>
        )}
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
