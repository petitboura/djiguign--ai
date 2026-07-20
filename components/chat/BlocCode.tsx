"use client";

import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import hljs from "highlight.js";

// Rendu des blocs ```lang ... ``` "code réel" du markdown (les langages
// spéciaux -- mermaid/chart/carte/html -- sont interceptés un niveau plus
// haut, dans le composant `pre` custom de BulleMessage.tsx, et ne
// passent jamais par ici).
//
// Coloration syntaxique : highlight.js appelé directement sur le texte
// brut (pas via un plugin rehype dans la chaîne ReactMarkdown) -- un
// plugin rehype réécrirait l'AST du <code> en spans AVANT que ce
// composant ne le reçoive, ce qui casserait deux choses : la détection
// du langage un niveau au-dessus (mermaid/chart/carte ont besoin du
// texte source intact) et le bouton copier (qui a besoin du texte brut,
// pas du HTML coloré). En gardant le texte brut jusqu'ici, les deux
// restent simples.
export function BlocCode({ langage, code }: { langage: string; code: string }) {
  const [copie, setCopie] = useState(false);

  const html = useMemo(() => {
    try {
      if (langage && hljs.getLanguage(langage)) {
        return hljs.highlight(code, { language: langage }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      // Langage non reconnu ou code encore incomplet (streaming) -- on
      // affiche le texte échappé tel quel plutôt que de planter.
      return code.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
  }, [langage, code]);

  function copier() {
    navigator.clipboard.writeText(code).then(() => {
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    });
  }

  return (
    <div className="dj-bloc-code group/code relative my-3 animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-[#100c09]">
      <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-dj-texte-muet">
          {langage || "texte"}
        </span>
        <button
          onClick={copier}
          aria-label="Copier le code"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          {copie ? (
            <>
              <Check size={12} /> Copié
            </>
          ) : (
            <>
              <Copy size={12} /> Copier
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
        <code
          className={`hljs language-${langage || "plaintext"}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
